"""
app/schemas/job.py
──────────────────
Request/response schemas for job creation and status endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PENDING      = "pending"
    RESEARCHING  = "researching"
    COPYING      = "copying"
    GENERATING   = "generating"
    COMPLETED    = "completed"
    FAILED       = "failed"


class JobDirection(str, Enum):
    RTL = "rtl"
    LTR = "ltr"


# ── Request: What the frontend sends to create a job ──────────────────────
class JobCreateRequest(BaseModel):
    business_name:   str = Field(..., min_length=2, max_length=100)
    business_type:   str = Field(..., min_length=2, max_length=100)
    target_city:     str = Field(..., min_length=2, max_length=100)
    locale:          str = Field(default="ar-SA")
    direction:       JobDirection = Field(default=JobDirection.RTL)
    competitors_url: list[str] = Field(default_factory=list, max_length=5)


# ── Response: What we return after job is queued ──────────────────────────
class JobCreateResponse(BaseModel):
    job_id:       UUID
    status:       JobStatus
    stream_token: str          # Short-lived token to authenticate the SSE stream
    stream_url:   str          # Ready-to-use SSE URL for the frontend


# ── Response: Job status polling ──────────────────────────────────────────
class JobStatusResponse(BaseModel):
    job_id:        UUID
    status:        JobStatus
    error_message: Optional[str] = None
    page_json:     Optional[dict] = None
    created_at:    datetime
    updated_at:    datetime
