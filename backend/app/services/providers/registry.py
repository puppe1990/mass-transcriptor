from __future__ import annotations

from app.services.providers.assemblyai_provider import AssemblyAiProvider
from app.services.providers.base import TranscriptionProvider
from app.services.providers.whisper_provider import WhisperProvider


def get_provider(
    provider_key: str, api_key: str | None = None, language: str | None = None
) -> TranscriptionProvider:
    if provider_key == "whisper":
        return WhisperProvider(language=language)
    if provider_key == "assemblyai":
        if not api_key:
            raise RuntimeError("ASSEMBLYAI_API_KEY is not configured")
        return AssemblyAiProvider(api_key)
    raise KeyError(provider_key)
