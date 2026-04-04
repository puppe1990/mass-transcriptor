import json

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Tenant, TenantProviderSetting


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


def test_get_provider_settings_returns_workspace_defaults():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.get("/t/acme/settings/providers", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "workspace_name": "Acme",
        "default_provider": "whisper",
        "whisper_language": "auto",
        "providers": {
            "whisper": {"enabled": True, "has_api_key": False},
            "assemblyai": {"enabled": False, "has_api_key": False},
        },
    }


def test_patch_provider_settings_encrypts_api_key_and_changes_default_provider():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.patch(
        "/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme Audio Lab",
            "default_provider": "assemblyai",
            "whisper_language": "pt",
            "assemblyai_api_key": "super-secret-key",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "workspace_name": "Acme Audio Lab",
        "default_provider": "assemblyai",
        "whisper_language": "pt",
        "providers": {
            "whisper": {"enabled": True, "has_api_key": False},
            "assemblyai": {"enabled": True, "has_api_key": True},
        },
    }

    with SessionLocal() as session:
        tenant = session.query(Tenant).filter(Tenant.slug == "acme").one()
        setting = (
            session.query(TenantProviderSetting)
            .filter(
                TenantProviderSetting.tenant_id == tenant.id,
                TenantProviderSetting.provider_key == "assemblyai",
            )
            .one()
        )

        assert tenant.default_provider == "assemblyai"
        assert tenant.name == "Acme Audio Lab"
        assert setting.provider_key == "assemblyai"
        assert setting.enabled == 1
        assert "super-secret-key" not in (setting.config_json or "")
        assert json.loads(setting.config_json or "{}")["api_key"] != "super-secret-key"


def test_upload_uses_updated_default_provider():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    client.patch(
        "/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme",
            "default_provider": "assemblyai",
            "whisper_language": "auto",
            "assemblyai_api_key": "super-secret-key",
        },
    )

    response = client.post(
        "/t/acme/uploads",
        headers=headers,
        files={"file": ("sample.wav", b"fake-audio", "audio/wav")},
    )

    assert response.status_code == 201
    assert response.json()["provider_key"] == "assemblyai"


def test_assemblyai_requires_workspace_key_for_workspace():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.patch(
        "/t/acme/settings/providers",
        headers=headers,
        json={"workspace_name": "Acme", "default_provider": "assemblyai"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "AssemblyAI requires an API key for this workspace"


def test_patch_provider_settings_rejects_unsupported_whisper_language():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    headers = auth_header(client, "acme")

    response = client.patch(
        "/t/acme/settings/providers",
        headers=headers,
        json={
            "workspace_name": "Acme",
            "default_provider": "whisper",
            "whisper_language": "fr",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Unsupported Whisper language"
