from app.config import Settings
from app.services.tenancy import normalize_tenant_slug


def test_default_database_url_uses_sqlite():
    settings = Settings()
    assert settings.database_url == "sqlite:///./app.db"


def test_normalize_tenant_slug_lowercases_input():
    assert normalize_tenant_slug("Acme-Co") == "acme-co"
