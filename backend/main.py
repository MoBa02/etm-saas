"""
main.py
───────
LandyLocal FastAPI entry point.

Startup: validates all env vars, confirms DB connectivity.
CORS: locked to the Next.js frontend URL defined in .env.
Routers: stubbed and ready to be filled in Phase 2.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_engine
from app.database import async_engine, supabase_client


# ── Lifespan: Runs on startup and shutdown ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 LandyLocal backend starting...")
    try:
        # Use Supabase SDK for health check — avoids pgbouncer prepared statement issue
        result = supabase_client.table("landing_page_jobs").select("id").limit(1).execute()
        print("✅ Database connection verified.")
    except Exception as e:
        print(f"⚠️  Database check failed: {e}")

    yield

    await async_engine.dispose()
    print("🛑 Shutdown complete.")


# ── App Instance ───────────────────────────────────────────────────────────
from fastapi.security import HTTPBearer

app = FastAPI(
    title="LandyLocal API",
    description="AI-powered localized landing page generator.",
    version="0.1.0",
    lifespan=lifespan,
)

security = HTTPBearer()  # ← Add this line

# ── CORS Middleware ────────────────────────────────────────────────────────
# In production, replace with your actual deployed frontend domain.
import os
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """Quick liveness probe for deployment platforms and load balancers."""
    return {"status": "ok", "service": "LandyLocal API", "version": "0.1.0"}


# ── Routers (Phase 2 stubs — uncomment as you build) ──────────────────────
from app.routers import jobs
#app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])