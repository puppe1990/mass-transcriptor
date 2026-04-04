from __future__ import annotations

from pydantic import BaseModel


class JobResponse(BaseModel):
    id: int
    status: str
    provider_key: str


class JobSummaryResponse(JobResponse):
    upload_id: int
    original_filename: str
    created_at: str


class JobDetailResponse(JobResponse):
    upload_id: int
    original_filename: str
    error_message: str | None = None
    markdown_path: str | None = None
    transcript_text: str | None = None
