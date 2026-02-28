"""
app/pipeline/tasks.py
─────────────────────
RQ background tasks. Each function is one step in the pipeline:
  clarifier_task → researcher_task → copywriter_task → structure_builder_task
"""

import json
import re
import time
from datetime import datetime, timezone

from supabase import create_client

from app.config import settings
from app.schemas.clarifier import ClarifierOutput
from app.redis_client import publish_job_update, task_queue


# ── Shared Utility ─────────────────────────────────────────────────────────
def clean_llm_json(raw: str) -> str:
    """Strip markdown code fences and leading/trailing whitespace."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


# ── Supabase & Helpers ─────────────────────────────────────────────────────
def _get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _update_job_status(supabase, job_id: str, status: str, error: str = None):
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if error:
        update_data["error_message"] = error
    supabase.table("landing_page_jobs").update(update_data).eq("id", job_id).execute()


def _save_step(supabase, job_id: str, step_name: str, step_order: int,
               input_data: dict, output_data: dict, duration_ms: int):
    supabase.table("job_steps").insert({
        "job_id":      job_id,
        "step_name":   step_name,
        "step_order":  step_order,
        "input_data":  input_data,
        "output_data": output_data,
        "duration_ms": duration_ms,
        "created_at":  datetime.now(timezone.utc).isoformat(),
    }).execute()


# ── STEP 1: Clarifier ──────────────────────────────────────────────────────
def clarifier_task(job_id: str, job_input: dict) -> None:
    supabase = _get_supabase()
    start_time = time.time()

    try:
        _update_job_status(supabase, job_id, "researching")
        publish_job_update(job_id, {
            "status":  "researching",
            "step":    "clarifier",
            "message": "🔍 Analyzing your business profile...",
            "payload": None,
        })

        prompt = f"""You are a business analyst specializing in local markets.

Analyze this business and return a JSON object that strictly matches this schema:
- business_name: string (cleaned)
- business_type: string (normalized category)
- target_city: string
- target_country: string (inferred from locale: {job_input['locale']})
- search_niche: string (concise English search term, e.g. "dental clinic")
- search_region: string (city + country in English, e.g. "Dammam Saudi Arabia")
- locale: string (BCP-47 tag)
- direction: "rtl" or "ltr"
- dialect: string (e.g. "Gulf Arabic", "Modern Standard Arabic")
- tone: string (e.g. "professional", "friendly", "urgent")
- usp: string or null
- additional_notes: string or null

Business Input:
- Name: {job_input['business_name']}
- Type: {job_input['business_type']}
- City: {job_input['target_city']}
- Locale: {job_input['locale']}
- Direction: {job_input['direction']}

Return ONLY valid JSON. No markdown, no explanation."""

        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)

        clarifier_output = ClarifierOutput.model_validate_json(clean_llm_json(response.text))
        duration_ms = int((time.time() - start_time) * 1000)

        _save_step(supabase, job_id, "clarifier", 1, job_input, clarifier_output.model_dump(), duration_ms)

        publish_job_update(job_id, {
            "status":  "researching",
            "step":    "clarifier",
            "message": f"✅ Profile clarified. Searching for competitors in {clarifier_output.search_region}...",
            "payload": clarifier_output.model_dump(),
        })

        task_queue.enqueue(
            researcher_task,
            kwargs={"job_id": job_id, "clarifier_output": clarifier_output.model_dump()},
            job_timeout=300,
        )

    except Exception as e:
        error_msg = f"Clarifier failed: {str(e)}"
        _update_job_status(supabase, job_id, "failed", error=error_msg)
        publish_job_update(job_id, {"status": "failed", "step": "clarifier", "message": error_msg, "payload": None})
        raise


# ── STEP 2: Researcher ─────────────────────────────────────────────────────
def researcher_task(job_id: str, clarifier_output: dict) -> None:
    from tavily import TavilyClient
    from app.schemas.researcher import ResearcherOutput

    supabase = _get_supabase()
    start_time = time.time()

    try:
        _update_job_status(supabase, job_id, "researching")
        publish_job_update(job_id, {
            "status":  "researching",
            "step":    "researcher",
            "message": "🔎 Searching for local competitors...",
            "payload": None,
        })

        tavily = TavilyClient(api_key=settings.tavily_api_key)
        niche  = clarifier_output["search_niche"]
        region = clarifier_output["search_region"]

        competitors_raw = tavily.search(
            query=f"Top competitors for {niche} in {region}",
            max_results=5, search_depth="basic",
        )
        pain_points_raw = tavily.search(
            query=f"What do customers in {region} care about most when choosing {niche}",
            max_results=5, search_depth="basic",
        )

        publish_job_update(job_id, {
            "status":  "researching",
            "step":    "researcher",
            "message": "🧠 Extracting insights from search results...",
            "payload": None,
        })

        from google import genai as google_genai
        llm = google_genai.Client(api_key=settings.gemini_api_key)

        competitor_texts = "\n".join(
            f"- {r['title']}: {r['content'][:200]}"
            for r in competitors_raw.get("results", [])
        )
        pain_point_texts = "\n".join(
            f"- {r['title']}: {r['content'][:200]}"
            for r in pain_points_raw.get("results", [])
        )

        prompt = f"""You are a market research analyst for local businesses in {region}.

Based on the following search results, extract structured competitive intelligence.

COMPETITOR SEARCH RESULTS:
{competitor_texts}

CUSTOMER PAIN POINTS SEARCH RESULTS:
{pain_point_texts}

Return ONLY a valid JSON object matching this exact schema:
{{
  "competitors": [
    {{"name": "string", "url": "string or null", "summary": "string"}}
  ],
  "local_pain_points": ["string", "string", ...],
  "cultural_hooks": ["string", "string", ...]
}}

- competitors: up to 5 real local businesses found in results
- local_pain_points: 3-5 specific things customers complain about or want in this region
- cultural_hooks: 3-5 culturally relevant values or motivators

Return ONLY valid JSON. No markdown, no explanation."""

        response = llm.models.generate_content(model="gemini-2.5-flash", contents=prompt)

        researcher_output = ResearcherOutput.model_validate_json(clean_llm_json(response.text))
        duration_ms = int((time.time() - start_time) * 1000)

        _save_step(supabase, job_id, "researcher", 2, clarifier_output, researcher_output.model_dump(), duration_ms)

        publish_job_update(job_id, {
            "status":  "researching",
            "step":    "researcher",
            "message": "✅ Research complete. Starting copywriting...",
            "payload": researcher_output.model_dump(),
        })

        task_queue.enqueue(
            copywriter_task,
            kwargs={
                "job_id":            job_id,
                "clarifier_output":  clarifier_output,
                "researcher_output": researcher_output.model_dump(),
            },
            job_timeout=300,
        )

    except Exception as e:
        _update_job_status(supabase, job_id, "failed", error=str(e))
        publish_job_update(job_id, {"status": "failed", "step": "researcher", "message": f"❌ Research failed: {str(e)}", "payload": None})
        raise


# ── STEP 3: Copywriter ─────────────────────────────────────────────────────
def copywriter_task(job_id: str, clarifier_output: dict, researcher_output: dict) -> None:
    from app.schemas.copywriter import LandingPageContent

    supabase = _get_supabase()
    start_time = time.time()

    try:
        _update_job_status(supabase, job_id, "copywriting")
        publish_job_update(job_id, {
            "status":  "copywriting",
            "step":    "copywriter",
            "message": "✍️ Writing your landing page copy...",
            "payload": None,
        })

        from google import genai as google_genai
        llm = google_genai.Client(api_key=settings.gemini_api_key)

        lang        = "Arabic" if clarifier_output["direction"] == "rtl" else "English"
        dialect     = clarifier_output.get("dialect", "Modern Standard Arabic")
        tone        = clarifier_output.get("tone", "professional")
        biz_name    = clarifier_output["business_name"]
        biz_type    = clarifier_output["business_type"]
        city        = clarifier_output["target_city"]
        usp         = clarifier_output.get("usp") or "quality and trust"
        pain_points = "\n".join(f"- {p}" for p in researcher_output.get("local_pain_points", []))
        hooks       = "\n".join(f"- {h}" for h in researcher_output.get("cultural_hooks", []))

        prompt = f"""You are an expert landing page copywriter specializing in {lang} marketing copy for the MENA region.

Business: {biz_name}
Type: {biz_type}
City: {city}
Tone: {tone}
Dialect: {dialect}
USP: {usp}

LOCAL PAIN POINTS:
{pain_points}

CULTURAL HOOKS:
{hooks}

Return ONLY a valid JSON object:
{{
  "hero": {{
    "headline": "string (max 10 words, powerful, in {lang})",
    "subheadline": "string (max 20 words, clarifies the value, in {lang})",
    "cta_text": "string (max 5 words, action verb, in {lang})"
  }},
  "features": [
    {{"title": "string", "description": "string"}}
  ],
  "benefits": [
    {{"title": "string", "description": "string"}}
  ],
  "cta_headline": "string (urgency-driven, in {lang})",
  "cta_subtext": "string (reassurance, in {lang})",
  "cta_button_text": "string (max 4 words, in {lang})",
  "social_proof": "string or null"
}}

- features: exactly 3 items
- benefits: exactly 3 items
- All text in {lang} ({dialect})
- Return ONLY valid JSON. No markdown, no explanation."""

        response = llm.models.generate_content(model="gemini-2.5-flash", contents=prompt)

        copy_output = LandingPageContent.model_validate_json(clean_llm_json(response.text))
        duration_ms = int((time.time() - start_time) * 1000)

        _save_step(
            supabase, job_id, "copywriter", 3,
            {"clarifier_output": clarifier_output, "researcher_output": researcher_output},
            copy_output.model_dump(), duration_ms,
        )

        publish_job_update(job_id, {
            "status":  "completed",
            "step":    "copywriter",
            "message": "✅ Copy ready. Building page structure...",
            "payload": copy_output.model_dump(),
        })

        task_queue.enqueue(
            structure_builder_task,
            kwargs={
                "job_id":           job_id,
                "clarifier_output": clarifier_output,
                "copy_output":      copy_output.model_dump(),
            },
            job_timeout=300,
        )

    except Exception as e:
        _update_job_status(supabase, job_id, "failed", error=str(e))
        publish_job_update(job_id, {"status": "failed", "step": "copywriter", "message": f"❌ Copywriting failed: {str(e)}", "payload": None})
        raise


# ── STEP 4: Structure Builder ──────────────────────────────────────────────
def structure_builder_task(job_id: str, clarifier_output: dict, copy_output: dict) -> None:
    from app.schemas.structure import LandingPageStructure, ComponentBlock, ThemeConfig

    supabase = _get_supabase()
    start_time = time.time()

    try:
        _update_job_status(supabase, job_id, "building")
        publish_job_update(job_id, {
            "status":  "building",
            "step":    "structure_builder",
            "message": "🏗️ Building your landing page structure...",
            "payload": None,
        })

        is_rtl   = clarifier_output.get("direction") == "rtl"
        locale   = clarifier_output.get("locale", "ar-SA")
        is_gcc   = any(code in locale for code in ["ar-SA", "ar-AE", "ar-KW", "ar-QA", "ar-BH", "ar-OM"])
        biz_name = clarifier_output.get("business_name", "")
        hero     = copy_output["hero"]
        features = copy_output["features"]
        benefits = copy_output["benefits"]

        layout = [
            ComponentBlock(id="hero-1", type="hero", data={
                "headline":    hero["headline"],
                "subheadline": hero["subheadline"],
                "cta_text":    hero["cta_text"],
                "social_proof": copy_output.get("social_proof"),
            }),
            ComponentBlock(id="features-1", type="features", data={
                "title": "مميزاتنا" if is_rtl else "Our Features",
                "items": features,
            }),
            ComponentBlock(id="benefits-1", type="benefits", data={
                "title": "لماذا نحن؟" if is_rtl else "Why Us?",
                "items": benefits,
            }),
        ]

        if is_gcc:
            layout.append(ComponentBlock(id="whatsapp-cta-1", type="whatsapp_cta", data={
                "headline":    copy_output.get("cta_headline"),
                "subtext":     copy_output.get("cta_subtext"),
                "button_text": copy_output.get("cta_button_text"),
                "wa_message":  f"مرحباً، جئت من صفحة إتمام وأود الاستفسار عن خدمات {biz_name}",
            }))

        layout.append(ComponentBlock(id="footer-1", type="footer", data={
            "text": "Built with ❤️ by Etm",
            "brand_url": "https://etm.sa",
        }))

        structure = LandingPageStructure(
            brand_name="Etm",
            theme=ThemeConfig(
                primary_color="#C8A96E",
                font_family="Cairo",
                border_radius="12px",
            ),
            rtl=is_rtl,
            locale=locale,
            layout=layout,
        )

        duration_ms = int((time.time() - start_time) * 1000)

        _save_step(supabase, job_id, "structure_builder", 4, copy_output, structure.model_dump(), duration_ms)

        supabase.table("landing_page_jobs").update({
            "status":     "completed",
            "structure":  structure.model_dump(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", job_id).execute()

        publish_job_update(job_id, {
            "status":  "completed",
            "step":    "structure_builder",
            "message": "🎉 Your landing page is ready!",
            "payload": structure.model_dump(),
        })

    except Exception as e:
        _update_job_status(supabase, job_id, "failed", error=str(e))
        publish_job_update(job_id, {"status": "failed", "step": "structure_builder", "message": f"❌ Structure build failed: {str(e)}", "payload": None})
        raise
