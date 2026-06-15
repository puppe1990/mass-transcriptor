from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


def auth_header(client: TestClient, slug: str = "acme") -> dict[str, str]:
    response = client.post(
        "/api/auth/signup",
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


def test_uploading_multiple_files_assigns_shared_batch_id():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")
    response = client.post(
        "/api/t/acme/uploads",
        headers=headers,
        files=[
            ("files", ("a.wav", b"fake-a", "audio/wav")),
            ("files", ("b.wav", b"fake-b", "audio/wav")),
        ],
    )
    assert response.status_code == 201
    payload = response.json()
    assert len(payload) == 2
    assert payload[0]["batch_id"] is not None
    assert payload[0]["batch_id"] == payload[1]["batch_id"]


def test_single_upload_has_no_batch_id():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")
    response = client.post(
        "/api/t/acme/uploads",
        headers=headers,
        files=[("files", ("solo.wav", b"fake", "audio/wav"))],
    )
    assert response.status_code == 201
    assert response.json()[0]["batch_id"] is None


def test_get_job_batch_returns_all_jobs_in_group():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")
    upload = client.post(
        "/api/t/acme/uploads",
        headers=headers,
        files=[
            ("files", ("first.wav", b"fake-a", "audio/wav")),
            ("files", ("second.wav", b"fake-b", "audio/wav")),
        ],
    )
    batch_id = upload.json()[0]["batch_id"]

    response = client.get(f"/api/t/acme/batches/{batch_id}", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == batch_id
    assert len(payload["jobs"]) == 2
    filenames = {job["original_filename"] for job in payload["jobs"]}
    assert filenames == {"first.wav", "second.wav"}


def test_list_jobs_includes_batch_id():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")
    client.post(
        "/api/t/acme/uploads",
        headers=headers,
        files=[
            ("files", ("a.wav", b"fake-a", "audio/wav")),
            ("files", ("b.wav", b"fake-b", "audio/wav")),
        ],
    )

    response = client.get("/api/t/acme/jobs", headers=headers)
    assert response.status_code == 200
    jobs = response.json()
    batched = [job for job in jobs if job["batch_id"] is not None]
    assert len(batched) == 2
    assert batched[0]["batch_id"] == batched[1]["batch_id"]
