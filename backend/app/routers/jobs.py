"""
app/routers/jobs.py
───────────────────
Endpoints:
  POST /api/jobs/create          → Verify JWT, create job, enqueue Clarifier
  GET  /api/jobs/{job_id}/status → Poll job status
  GET  /api/jobs/stream/{job_id} → SSE stream (auth via ?token=)
"""

import json
import asyncio
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import StreamingResponse
import httpx
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
import json

from app.config import settings
from app.database import supabase_client
from app.redis_client import redis_conn, task_queue, publish_job_update
from app.schemas.job import (
    JobCreateRequest,
    JobCreateResponse,
    JobStatusResponse,
)
from app.pipeline.tasks import clarifier_task
from fastapi.security import HTTPBearer
from supabase import create_client



security = HTTPBearer()



router = APIRouter()


# ── Auth Helper ────────────────────────────────────────────────────────────
# ── JWKS cache (fetched once, reused) ─────────────────────────────────────
_jwks_cache = None

async def _get_jwks():
    """Fetch Supabase's public JWKS keys (cached after first fetch)."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
    return _jwks_cache


async def verify_supabase_jwt(request: Request) -> dict:
    """
    Verifies Supabase JWT using their public JWKS endpoint.
    Supports both ES256 (new) and HS256 (legacy) algorithms.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ")[1]

    try:
        # Get the key id from token header
        unverified_header = jwt.get_unverified_header(token)
        algorithm = unverified_header.get("alg", "HS256")

        if algorithm == "ES256":
            # Fetch public key from Supabase JWKS endpoint
            jwks = await _get_jwks()
            kid = unverified_header.get("kid")

            # Find matching key
            public_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    public_key = jwk.construct(key)
                    break

            if not public_key:
                raise HTTPException(status_code=401, detail="No matching public key found")

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
        else:
            # Legacy HS256
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        return payload

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ── Stream Token Helpers ───────────────────────────────────────────────────
def _generate_stream_token(job_id: str, user_id: str) -> str:
    """
    Creates a short-lived JWT specifically for authenticating the SSE stream.
    The SSE URL is passed to the frontend, which appends it as ?token=
    This avoids sending the Supabase JWT in a URL query param.
    """
    payload = {
        "job_id":  job_id,
        "user_id": user_id,
        "exp":     datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.stream_token_secret, algorithm="HS256")


def _verify_stream_token(token: str) -> dict:
    """Verifies the SSE stream token and returns its payload."""
    try:
        return jwt.decode(token, settings.stream_token_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired stream token")


# ── POST /api/jobs/create ──────────────────────────────────────────────────
@router.post("/create", response_model=JobCreateResponse)
async def create_job(
    body: JobCreateRequest,
    user: dict = Depends(verify_supabase_jwt),
):
    """
    1. Verifies Supabase JWT
    2. Creates a landing_page_jobs row in Supabase
    3. Enqueues the clarifier_task in Redis via RQ
    4. Returns job_id + SSE stream URL with auth token
    """
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not extract user ID from token")

    job_id = str(uuid4())

    # ── Insert job into Supabase ───────────────────────────────────────────
    job_data = {
        "id":             job_id,
        "user_id":        user_id,
        "business_name":  body.business_name,
        "business_type":  body.business_type,
        "target_city":    body.target_city,
        "locale":         body.locale,
        "direction":      body.direction.value,
        "competitors_url": body.competitors_url,
        "status":         "pending",
        "created_at":     datetime.now(timezone.utc).isoformat(),
        "updated_at":     datetime.now(timezone.utc).isoformat(),
    }

    result = supabase_client.table("landing_page_jobs").insert(job_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job in database")

    # ── Enqueue Clarifier task in RQ ───────────────────────────────────────
    print("⚡ Enqueuing job to Redis...", job_id)
    task_queue.enqueue(
    clarifier_task,
    kwargs={
        "job_id": job_id,
        "job_input": {
            "business_name": body.business_name,
            "business_type": body.business_type,
            "target_city":   body.target_city,
            "locale":        body.locale,
            "direction":     body.direction.value,
        },
    },
    job_timeout=300,
)
    print("✅ Job enqueued!")


    # ── Generate SSE stream token ──────────────────────────────────────────
    stream_token = _generate_stream_token(job_id, user_id)
    stream_url   = f"/api/jobs/stream/{job_id}?token={stream_token}"

    return JobCreateResponse(
        job_id=job_id,
        status="pending",
        stream_token=stream_token,
        stream_url=stream_url,
    )


# ── GET /api/jobs/{job_id}/status ──────────────────────────────────────────
@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    user: dict = Depends(verify_supabase_jwt),
):
    """Polling endpoint. Returns current job status from Supabase."""
    result = (
        supabase_client.table("landing_page_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.get("sub"))  # RLS enforcement in application layer too
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(**result.data)


# ── GET /api/jobs/stream/{job_id} ──────────────────────────────────────────
@router.get("/stream/{job_id}")
async def stream_job_updates(
    job_id: str,
    token: str = Query(..., description="Stream auth token from JobCreateResponse"),
):
    """
    SSE endpoint. The frontend connects here immediately after job creation
    and receives real-time status updates as the pipeline progresses.

    Auth: short-lived JWT passed as ?token= query param.
    Protocol: text/event-stream (SSE)

    Each event is a JSON object:
    {
        "status":  "researching",
        "step":    "clarifier",
        "message": "Analyzing your business...",
        "payload": { ...step output... }
    }
    """
    # Verify stream token
    token_data = _verify_stream_token(token)
    if token_data.get("job_id") != job_id:
        raise HTTPException(status_code=403, detail="Token does not match job ID")

    async def event_generator():
        """
        Subscribes to Redis pub/sub channel for this job.
        Forwards every published message as an SSE event.
        Sends a heartbeat every 15s to keep the connection alive.
        Closes when job reaches a terminal state (completed/failed).
        """
        # Use a sync Redis pubsub in a thread-safe way with asyncio
        pubsub = redis_conn.pubsub()
        channel = f"job:{job_id}:updates"
        pubsub.subscribe(channel)

        terminal_states = {"completed", "failed"}
        heartbeat_interval = 15  # seconds

        try:
            # Send initial connection confirmation
            yield f"data: {json.dumps({'status': 'connected', 'job_id': job_id})}\n\n"

            last_heartbeat = asyncio.get_event_loop().time()

            while True:
                # Check for new messages (non-blocking)
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)

                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    yield f"data: {json.dumps(data)}\n\n"

                    # Close stream on terminal state
                    if data.get("status") in terminal_states:
                        break

                # Heartbeat to prevent connection timeout
                now = asyncio.get_event_loop().time()
                if now - last_heartbeat > heartbeat_interval:
                    yield f": heartbeat\n\n"
                    last_heartbeat = now

                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            # Client disconnected — clean up gracefully
            pass
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",   # Critical: disables Nginx buffering
            "Connection":       "keep-alive",
        },
    )
# app/routers/jobs.py — confirm this exists at the bottom
@router.get("/public/{job_id}")
async def get_public_job(job_id: str):
    """No auth required. Returns structure for a completed job."""
    result = (
        supabase_client.table("landing_page_jobs")
        .select("id, status, structure, created_at")
        .eq("id", job_id)
        .eq("status", "completed")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found or not completed")
    return result.data
