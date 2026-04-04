from __future__ import annotations

from app.config import Settings
from app.services.providers.assemblyai_provider import AssemblyAiProvider
from app.services.providers.base import TranscriptionProvider
from app.services.providers.whisper_provider import WhisperProvider


def get_provider(provider_key: str) -> TranscriptionProvider:
    if provider_key == "whisper":
        return WhisperProvider()
    if provider_key == "assemblyai":
        settings = Settings()
        if not settings.assemblyai_api_key:
            raise RuntimeError("ASSEMBLYAI_API_KEY is not configured")
        return AssemblyAiProvider(settings.assemblyai_api_key)
    raise KeyError(provider_key)
