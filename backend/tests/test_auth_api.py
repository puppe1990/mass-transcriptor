from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Tenant, TenantMembership, User


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_auth_modules_import():
    from app.services.auth import hash_password, verify_password  # noqa: F401


def test_auth_models_exist():
    assert User.__tablename__ == "users"
    assert TenantMembership.__tablename__ == "tenant_memberships"


def test_password_hash_and_verify_roundtrip():
    from app.services.auth import hash_password, verify_password

    password_hash = hash_password("secret123")
    assert verify_password("secret123", password_hash) is True
    assert verify_password("wrong", password_hash) is False


def test_create_access_token_returns_string():
    from app.services.auth import create_access_token

    token = create_access_token(user_id=1, email="owner@example.com")
    assert isinstance(token, str)
    assert len(token) > 20


def test_signup_creates_tenant_user_and_membership():
    reset_db()
    client = TestClient(app)
    response = client.post(
        "/auth/signup",
        json={
            "workspace_name": "Acme",
            "workspace_slug": "acme",
            "name": "Owner",
            "email": "owner@example.com",
            "password": "secret123",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["tenant"]["slug"] == "acme"
    assert payload["access_token"]


def test_signin_returns_token_for_valid_credentials():
    reset_db()
    client = TestClient(app)
    client.post(
        "/auth/signup",
        json={
            "workspace_name": "Acme",
            "workspace_slug": "acme",
            "name": "Owner",
            "email": "owner@example.com",
            "password": "secret123",
        },
    )
    response = client.post(
        "/auth/signin",
        json={"email": "owner@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_me_returns_current_user():
    reset_db()
    client = TestClient(app)
    signup_response = client.post(
        "/auth/signup",
        json={
            "workspace_name": "Acme",
            "workspace_slug": "acme",
            "name": "Owner",
            "email": "owner@example.com",
            "password": "secret123",
        },
    )
    token = signup_response.json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "owner@example.com"


def test_upload_rejects_unauthenticated_requests():
    reset_db()
    with SessionLocal() as session:
        session.add(Tenant(slug="acme", name="Acme", default_provider="whisper"))
        session.commit()

    client = TestClient(app)
    response = client.post("/t/acme/uploads", files={"file": ("sample.wav", b"data", "audio/wav")})
    assert response.status_code == 401


def test_upload_rejects_user_without_membership():
    reset_db()
    client = TestClient(app)
    client.post(
        "/auth/signup",
        json={
            "workspace_name": "Acme",
            "workspace_slug": "acme",
            "name": "Owner",
            "email": "owner@example.com",
            "password": "secret123",
        },
    )
    outsider = client.post(
        "/auth/signup",
        json={
            "workspace_name": "Beta",
            "workspace_slug": "beta",
            "name": "Outsider",
            "email": "outsider@example.com",
            "password": "secret123",
        },
    )
    outsider_token = outsider.json()["access_token"]
    response = client.post(
        "/t/acme/uploads",
        headers={"Authorization": f"Bearer {outsider_token}"},
        files={"file": ("sample.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 403


def test_upload_accepts_user_with_membership():
    reset_db()
    client = TestClient(app)
    signup = client.post(
        "/auth/signup",
        json={
            "workspace_name": "Acme",
            "workspace_slug": "acme",
            "name": "Owner",
            "email": "owner@example.com",
            "password": "secret123",
        },
    )
    token = signup.json()["access_token"]
    response = client.post(
        "/t/acme/uploads",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("sample.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 201
