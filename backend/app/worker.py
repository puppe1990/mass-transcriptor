from __future__ import annotations

import time

from app.config import Settings
from app.db import SessionLocal
from app.services.jobs import get_next_queued_job, mark_job_completed, mark_job_failed, mark_job_processing
from app.services.markdown import render_transcript_markdown
from app.services.providers.registry import get_provider
from app.services.storage import write_markdown

settings = Settings()


def process_next_job() -> bool:
    with SessionLocal() as session:
        job = get_next_queued_job(session)
        if job is None:
            return False

        try:
            mark_job_processing(session, job)
            provider = get_provider(job.provider_key)
            result = provider.transcribe(job.upload.audio_path)
            markdown = render_transcript_markdown(
                result.transcript_text,
                job.upload.original_filename,
                result.provider_key,
            )
            markdown_path = write_markdown(job.tenant.slug, job.upload.id, markdown)
            mark_job_completed(session, job, markdown_path, result.transcript_text, result.metadata)
        except Exception as exc:  # pragma: no cover
            mark_job_failed(session, job, str(exc))
        return True


def run_worker_forever() -> None:
    while True:
        processed = process_next_job()
        if not processed:
            time.sleep(settings.polling_interval_seconds)


if __name__ == "__main__":
    run_worker_forever()
