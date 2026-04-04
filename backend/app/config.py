from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app.db"
    storage_root: str = str(Path(__file__).resolve().parents[2] / "storage")
    polling_interval_seconds: float = 2.0
    default_provider: str = "whisper"
    assemblyai_api_key: str | None = None
    whisper_model: str = "base"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
