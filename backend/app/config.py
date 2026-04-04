from __future__ import annotations

import base64
import hashlib
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app.db"
    storage_root: str = str(Path(__file__).resolve().parents[2] / "storage")
    polling_interval_seconds: float = 2.0
    default_provider: str = "whisper"
    assemblyai_api_key: str | None = None
    whisper_model: str = "base"
    jwt_secret_key: str = "change-me-change-me-change-me-please"
    jwt_algorithm: str = "HS256"
    encryption_secret_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def derived_encryption_key(self) -> bytes:
        secret = self.encryption_secret_key or self.jwt_secret_key
        digest = hashlib.sha256(secret.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)
