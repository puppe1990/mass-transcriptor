from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_session
from app.schemas import JobDetailResponse, JobResponse, JobSummaryResponse
from app.services.jobs import (
    create_transcription_job,
    create_upload_record,
    get_job_for_tenant,
    get_result_for_job,
    list_jobs_for_tenant,
    retry_job,
    update_upload_audio_path,
)
from app.services.storage import write_audio_bytes
from app.services.tenancy import get_tenant_by_slug

router = APIRouter()
settings = Settings()


@router.post("/t/{tenant_slug}/uploads", status_code=status.HTTP_201_CREATED, response_model=JobResponse)
async def upload_audio(
    tenant_slug: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> JobResponse:
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    upload = create_upload_record(
        session=session,
        tenant_id=tenant.id,
        original_filename=file.filename or "audio.bin",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
        audio_path="pending",
    )
    audio_path = write_audio_bytes(tenant.slug, upload.id, Path(upload.original_filename).name, contents)
    update_upload_audio_path(session, upload, audio_path)
    provider_key = tenant.default_provider or settings.default_provider
    job = create_transcription_job(session, tenant.id, upload.id, provider_key)
    return JobResponse(id=job.id, status=job.status, provider_key=job.provider_key)


@router.get("/t/{tenant_slug}/jobs", response_model=list[JobSummaryResponse])
def list_jobs(tenant_slug: str, session: Session = Depends(get_session)) -> list[JobSummaryResponse]:
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    jobs = list_jobs_for_tenant(session, tenant.id)
    return [
        JobSummaryResponse(
            id=job.id,
            status=job.status,
            provider_key=job.provider_key,
            upload_id=job.upload_id,
            original_filename=job.upload.original_filename,
            created_at=job.created_at.isoformat(),
        )
        for job in jobs
    ]


@router.get("/t/{tenant_slug}/jobs/{job_id}", response_model=JobDetailResponse)
def get_job_detail(tenant_slug: str, job_id: int, session: Session = Depends(get_session)) -> JobDetailResponse:
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    job = get_job_for_tenant(session, tenant.id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    result = get_result_for_job(session, job.id)
    return JobDetailResponse(
        id=job.id,
        status=job.status,
        provider_key=job.provider_key,
        upload_id=job.upload_id,
        original_filename=job.upload.original_filename,
        error_message=job.error_message,
        markdown_path=result.markdown_path if result else None,
        transcript_text=result.transcript_text if result else None,
    )


@router.post("/t/{tenant_slug}/jobs/{job_id}/retry", response_model=JobResponse)
def retry_failed_job(tenant_slug: str, job_id: int, session: Session = Depends(get_session)) -> JobResponse:
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    job = get_job_for_tenant(session, tenant.id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "failed":
        raise HTTPException(status_code=409, detail="Only failed jobs can be retried")
    retried = retry_job(session, job)
    return JobResponse(id=retried.id, status=retried.status, provider_key=retried.provider_key)


@router.get("/t/{tenant_slug}/jobs/{job_id}/download")
def download_markdown(tenant_slug: str, job_id: int, session: Session = Depends(get_session)) -> FileResponse:
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    job = get_job_for_tenant(session, tenant.id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    result = get_result_for_job(session, job.id)
    if result is None or not Path(result.markdown_path).exists():
        raise HTTPException(status_code=404, detail="Transcript file not found")
    return FileResponse(
        result.markdown_path,
        media_type="text/markdown",
        filename=f"{Path(job.upload.original_filename).stem}.md",
    )
