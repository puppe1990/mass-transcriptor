from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Tenant
from app.services.assemblyai_account import AssemblyAiCreditsInfo


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


def test_get_provider_settings_returns_workspace_defaults(monkeypatch):
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "")
    monkeypatch.setattr(
        "app.services.provider_settings.fetch_assemblyai_credits",
        lambda api_key: AssemblyAiCreditsInfo(status="not_configured"),
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.get("/api/t/acme/settings/providers", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "workspace_name": "Acme",
        "default_provider": "assemblyai",
        "whisper_language": "auto",
        "providers": {
            "whisper": {"enabled": True, "has_api_key": False},
            "assemblyai": {"enabled": False, "has_api_key": False},
        },
        "assemblyai_credits": {
            "status": "not_configured",
            "balance_usd": None,
            "message": None,
            "dashboard_url": "https://www.assemblyai.com/dashboard/account/billing",
        },
    }


def test_get_provider_settings_reflects_assemblyai_env_key(monkeypatch):
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "server-api-key")
    monkeypatch.setattr(
        "app.services.provider_settings.fetch_assemblyai_credits",
        lambda api_key: AssemblyAiCreditsInfo(status="available", balance_usd=12.34),
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.get("/api/t/acme/settings/providers", headers=headers)

    assert response.status_code == 200
    assert response.json()["providers"]["assemblyai"] == {
        "enabled": True,
        "has_api_key": True,
    }
    assert response.json()["assemblyai_credits"] == {
        "status": "available",
        "balance_usd": 12.34,
        "message": None,
        "dashboard_url": "https://www.assemblyai.com/dashboard/account/billing",
    }


def test_patch_provider_settings_changes_default_provider(monkeypatch):
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "server-api-key")
    monkeypatch.setattr(
        "app.services.provider_settings.fetch_assemblyai_credits",
        lambda api_key: AssemblyAiCreditsInfo(status="unavailable", message="No balance via API"),
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.patch(
        "/api/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme Audio Lab",
            "default_provider": "assemblyai",
            "whisper_language": "pt",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["workspace_name"] == "Acme Audio Lab"
    assert payload["default_provider"] == "assemblyai"
    assert payload["whisper_language"] == "pt"
    assert payload["providers"] == {
        "whisper": {"enabled": True, "has_api_key": False},
        "assemblyai": {"enabled": True, "has_api_key": True},
    }
    assert payload["assemblyai_credits"]["status"] == "unavailable"

    with SessionLocal() as session:
        tenant = session.query(Tenant).filter(Tenant.slug == "acme").one()
        assert tenant.default_provider == "assemblyai"
        assert tenant.name == "Acme Audio Lab"


def test_upload_uses_updated_default_provider(monkeypatch):
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "server-api-key")
    monkeypatch.setattr(
        "app.services.provider_settings.fetch_assemblyai_credits",
        lambda api_key: AssemblyAiCreditsInfo(status="available", balance_usd=5.0),
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    client.patch(
        "/api/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme",
            "default_provider": "assemblyai",
            "whisper_language": "auto",
        },
    )

    response = client.post(
        "/api/t/acme/uploads",
        headers=headers,
        files=[("files", ("sample.wav", b"fake-audio", "audio/wav"))],
    )

    assert response.status_code == 201
    assert response.json()[0]["provider_key"] == "assemblyai"


def test_assemblyai_requires_server_env_key(monkeypatch):
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "")
    monkeypatch.setattr(
        "app.services.provider_settings.fetch_assemblyai_credits",
        lambda api_key: AssemblyAiCreditsInfo(status="not_configured"),
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.patch(
        "/api/t/acme/settings/providers",
        headers=headers,
        json={"workspace_name": "Acme", "default_provider": "assemblyai"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "AssemblyAI requires ASSEMBLYAI_API_KEY to be configured on the server"
    )


def test_patch_provider_settings_rejects_unsupported_whisper_language(monkeypatch):
    monkeypatch.setenv("ASSEMBLYAI_API_KEY", "")
    monkeypatch.setattr(
        "app.services.provider_settings.fetch_assemblyai_credits",
        lambda api_key: AssemblyAiCreditsInfo(status="not_configured"),
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.patch(
        "/api/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme",
            "default_provider": "whisper",
            "whisper_language": "fr",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Unsupported Whisper language"
