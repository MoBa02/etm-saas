"""
app/database.py
───────────────
Database connections for LandyLocal.

Architecture decision: Since we use Supabase's pgbouncer pooler,
SQLAlchemy's startup version check causes DuplicatePreparedStatement errors.
Solution: Remove SQLAlchemy engine entirely from startup check.
All DB operations go through the Supabase SDK directly.
SQLAlchemy async sessions are available for Phase 3+ ORM usage.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from supabase import create_client, Client

from app.config import settings


# ── 1. Supabase SDK Client ─────────────────────────────────────────────────
# This is our PRIMARY database interface. Used for all CRUD in Phase 2.
supabase_client: Client = create_client(
    supabase_url=settings.supabase_url,
    supabase_key=settings.supabase_service_role_key,
)


# ── 2. Async SQLAlchemy Engine (Phase 3+ ORM usage only) ──────────────────
# NOT used at startup. Only used in route dependencies via get_db().
async_engine = create_async_engine(
    settings.database_url,
    poolclass=NullPool,
    execution_options={"compiled_cache": {}},
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── 3. ORM Base ────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── 4. FastAPI DB session dependency ──────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
