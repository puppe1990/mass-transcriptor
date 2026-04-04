from __future__ import annotations

import whisper

from app.config import Settings
from app.services.providers.base import ProviderResult, TranscriptionProvider


class WhisperProvider(TranscriptionProvider):
    provider_key = "whisper"

    def __init__(self) -> None:
        self.settings = Settings()

    def transcribe(self, file_path: str) -> ProviderResult:
        model = whisper.load_model(self.settings.whisper_model)
        result = model.transcribe(file_path)
        return ProviderResult(
            transcript_text=(result.get("text") or "").strip(),
            provider_key=self.provider_key,
            metadata={"language": result.get("language")},
        )
