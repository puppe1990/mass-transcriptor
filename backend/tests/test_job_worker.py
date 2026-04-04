import json

from app.db import Base, SessionLocal, engine
from app.models import Tenant, TenantMembership, TranscriptionJob, TranscriptionResult, Upload, User
from app.services.markdown import render_transcript_markdown
from app.services.providers.base import ProviderResult
from app.worker import process_next_job


def test_render_transcript_markdown_has_heading():
    output = render_transcript_markdown("hello world", "sample.wav", "whisper")
    assert output.startswith("# Transcript")


def test_process_next_job_marks_job_completed(monkeypatch, tmp_path):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    audio_path = tmp_path / "sample.wav"
    audio_path.write_bytes(b"fake-audio")

    with SessionLocal() as session:
        tenant = Tenant(slug="acme", name="Acme", default_provider="whisper")
        user = User(name="Owner", email="owner@example.com", password_hash="hashed")
        session.add_all([tenant, user])
        session.commit()
        session.refresh(tenant)
        session.refresh(user)
        session.add(TenantMembership(tenant_id=tenant.id, user_id=user.id, role="owner"))
        session.commit()

        upload = Upload(
            tenant_id=tenant.id,
            original_filename="sample.wav",
            mime_type="audio/wav",
            size_bytes=10,
            audio_path=str(audio_path),
        )
        session.add(upload)
        session.commit()
        session.refresh(upload)

        job = TranscriptionJob(
            tenant_id=tenant.id,
            upload_id=upload.id,
            provider_key="whisper",
            status="queued",
        )
        session.add(job)
        session.commit()

    class DummyProvider:
        def transcribe(self, file_path: str) -> ProviderResult:
            return ProviderResult(
                transcript_text=f"Transcript for {file_path}",
                provider_key="whisper",
                metadata={"language": "en"},
            )

    monkeypatch.setattr("app.worker.get_provider", lambda provider_key: DummyProvider())

    assert process_next_job() is True

    with SessionLocal() as session:
        stored_job = session.query(TranscriptionJob).one()
        stored_result = session.query(TranscriptionResult).one()

        assert stored_job.status == "completed"
        assert stored_result.transcript_text == f"Transcript for {audio_path}"
        assert stored_result.markdown_path.endswith("transcript.md")
        assert json.loads(stored_result.provider_metadata_json or "{}") == {"language": "en"}


def test_process_next_job_marks_job_failed_when_provider_errors(monkeypatch, tmp_path):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    audio_path = tmp_path / "sample.wav"
    audio_path.write_bytes(b"fake-audio")

    with SessionLocal() as session:
        tenant = Tenant(slug="acme", name="Acme", default_provider="whisper")
        user = User(name="Owner", email="owner@example.com", password_hash="hashed")
        session.add_all([tenant, user])
        session.commit()
        session.refresh(tenant)
        session.refresh(user)
        session.add(TenantMembership(tenant_id=tenant.id, user_id=user.id, role="owner"))
        session.commit()

        upload = Upload(
            tenant_id=tenant.id,
            original_filename="sample.wav",
            mime_type="audio/wav",
            size_bytes=10,
            audio_path=str(audio_path),
        )
        session.add(upload)
        session.commit()
        session.refresh(upload)

        job = TranscriptionJob(
            tenant_id=tenant.id,
            upload_id=upload.id,
            provider_key="assemblyai",
            status="queued",
        )
        session.add(job)
        session.commit()

    class BrokenProvider:
        def transcribe(self, file_path: str) -> ProviderResult:
            raise RuntimeError("provider misconfigured")

    monkeypatch.setattr("app.worker.get_provider", lambda provider_key: BrokenProvider())

    assert process_next_job() is True

    with SessionLocal() as session:
        stored_job = session.query(TranscriptionJob).one()
        results = session.query(TranscriptionResult).all()

        assert stored_job.status == "failed"
        assert stored_job.error_message == "provider misconfigured"
        assert results == []
