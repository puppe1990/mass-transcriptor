from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Tenant, TranscriptionJob, TranscriptionResult, Upload


def auth_header(client: TestClient, slug: str = "acme") -> dict[str, str]:
    response = client.post(
        "/auth/signup",
        json={
            "workspace_name": slug.capitalize(),
            "workspace_slug": slug,
            "name": "Owner",
            "email": f"{slug}@example.com",
            "password": "secret123",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_post_upload_returns_queued_job():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")
    response = client.post(
        "/t/acme/uploads",
        headers=headers,
        files={"file": ("sample.wav", b"fake-audio", "audio/wav")},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] == "queued"
    assert payload["provider_key"] == "whisper"


def test_retry_failed_job_requeues_it():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    with SessionLocal() as session:
        tenant = session.query(Tenant).filter(Tenant.slug == "acme").one()

        upload = Upload(
            tenant_id=tenant.id,
            original_filename="sample.wav",
            mime_type="audio/wav",
            size_bytes=10,
            audio_path="/tmp/sample.wav",
        )
        session.add(upload)
        session.commit()
        session.refresh(upload)

        job = TranscriptionJob(
            tenant_id=tenant.id,
            upload_id=upload.id,
            provider_key="whisper",
            status="failed",
            error_message="boom",
        )
        session.add(job)
        session.commit()
        session.refresh(job)

    response = client.post(f"/t/acme/jobs/{job.id}/retry", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued"


def test_download_markdown_returns_transcript_file(tmp_path):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    transcript_path = tmp_path / "transcript.md"
    transcript_path.write_text("# Transcript\n\nhello", encoding="utf-8")

    client = TestClient(app)
    headers = auth_header(client, "acme")

    with SessionLocal() as session:
        tenant = session.query(Tenant).filter(Tenant.slug == "acme").one()

        upload = Upload(
            tenant_id=tenant.id,
            original_filename="sample.wav",
            mime_type="audio/wav",
            size_bytes=10,
            audio_path="/tmp/sample.wav",
        )
        session.add(upload)
        session.commit()
        session.refresh(upload)

        job = TranscriptionJob(
            tenant_id=tenant.id,
            upload_id=upload.id,
            provider_key="whisper",
            status="completed",
        )
        session.add(job)
        session.commit()
        session.refresh(job)

        result = TranscriptionResult(
            job_id=job.id,
            tenant_id=tenant.id,
            markdown_path=str(transcript_path),
            transcript_text="hello",
            provider_metadata_json="{}",
        )
        session.add(result)
        session.commit()
        job_id = job.id

    response = client.get(f"/t/acme/jobs/{job_id}/download", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert "hello" in response.text


def test_startup_does_not_seed_default_tenant():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestClient(app):
        pass

    with SessionLocal() as session:
        tenants = session.query(Tenant).all()
        assert len(tenants) == 0
