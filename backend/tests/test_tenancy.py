from app.config import Settings
from app.db import settings as db_settings
from app.services.tenancy import normalize_tenant_slug


def test_default_database_url_uses_sqlite():
    settings = Settings()
    assert settings.database_url.startswith("sqlite:///")


def test_pytest_runtime_uses_isolated_database():
    assert db_settings.database_url.startswith("sqlite:///")
    assert not db_settings.database_url.endswith("/app.db")


def test_normalize_tenant_slug_lowercases_input():
    assert normalize_tenant_slug("Acme-Co") == "acme-co"
