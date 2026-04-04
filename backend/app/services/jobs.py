from __future__ import annotations

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import TranscriptionJob, TranscriptionResult, Upload


def utc_now() -> datetime:
    return datetime.now(UTC)


def create_upload_record(
    session: Session,
    tenant_id: int,
    original_filename: str,
    mime_type: str,
    size_bytes: int,
    audio_path: str,
) -> Upload:
    upload = Upload(
        tenant_id=tenant_id,
        original_filename=original_filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        audio_path=audio_path,
    )
    session.add(upload)
    session.commit()
    session.refresh(upload)
    return upload


def update_upload_audio_path(session: Session, upload: Upload, audio_path: str) -> Upload:
    upload.audio_path = audio_path
    session.add(upload)
    session.commit()
    session.refresh(upload)
    return upload


def create_transcription_job(session: Session, tenant_id: int, upload_id: int, provider_key: str) -> TranscriptionJob:
    job = TranscriptionJob(
        tenant_id=tenant_id,
        upload_id=upload_id,
        provider_key=provider_key,
        status="queued",
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def list_jobs_for_tenant(session: Session, tenant_id: int) -> list[TranscriptionJob]:
    stmt = (
        select(TranscriptionJob)
        .options(selectinload(TranscriptionJob.upload))
        .where(TranscriptionJob.tenant_id == tenant_id)
        .order_by(TranscriptionJob.created_at.desc())
    )
    return list(session.scalars(stmt))


def get_job_for_tenant(session: Session, tenant_id: int, job_id: int) -> TranscriptionJob | None:
    stmt = (
        select(TranscriptionJob)
        .options(selectinload(TranscriptionJob.upload))
        .where(TranscriptionJob.tenant_id == tenant_id, TranscriptionJob.id == job_id)
    )
    return session.scalar(stmt)


def get_result_for_job(session: Session, job_id: int) -> TranscriptionResult | None:
    stmt = select(TranscriptionResult).where(TranscriptionResult.job_id == job_id)
    return session.scalar(stmt)


def get_next_queued_job(session: Session) -> TranscriptionJob | None:
    stmt = (
        select(TranscriptionJob)
        .options(selectinload(TranscriptionJob.upload), selectinload(TranscriptionJob.tenant))
        .where(TranscriptionJob.status == "queued")
        .order_by(TranscriptionJob.created_at.asc())
    )
    return session.scalar(stmt)


def mark_job_processing(session: Session, job: TranscriptionJob) -> None:
    job.status = "processing"
    job.started_at = utc_now()
    job.updated_at = utc_now()
    session.add(job)
    session.commit()


def mark_job_completed(
    session: Session,
    job: TranscriptionJob,
    markdown_path: str,
    transcript_text: str,
    provider_metadata: dict | None = None,
) -> None:
    session.add(
        TranscriptionResult(
            job_id=job.id,
            tenant_id=job.tenant_id,
            markdown_path=markdown_path,
            transcript_text=transcript_text,
            provider_metadata_json=json.dumps(provider_metadata or {}),
        )
    )
    job.status = "completed"
    job.completed_at = utc_now()
    job.updated_at = utc_now()
    session.add(job)
    session.commit()


def mark_job_failed(session: Session, job: TranscriptionJob, error_message: str) -> None:
    job.status = "failed"
    job.error_message = error_message[:500]
    job.completed_at = utc_now()
    job.updated_at = utc_now()
    session.add(job)
    session.commit()


def retry_job(session: Session, job: TranscriptionJob) -> TranscriptionJob:
    job.status = "queued"
    job.error_message = None
    job.started_at = None
    job.completed_at = None
    job.updated_at = utc_now()
    session.add(job)
    session.commit()
    session.refresh(job)
    return job
