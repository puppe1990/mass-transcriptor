from __future__ import annotations

from functools import lru_cache

import whisper

from app.config import Settings
from app.services.providers.base import ProviderResult, TranscriptionProvider


@lru_cache(maxsize=4)
def load_whisper_model(model_name: str):
    return whisper.load_model(model_name)


class WhisperProvider(TranscriptionProvider):
    provider_key = "whisper"

    def __init__(self) -> None:
        self.settings = Settings()

    def transcribe(self, file_path: str) -> ProviderResult:
        try:
            model = load_whisper_model(self.settings.whisper_model)
            result = model.transcribe(file_path)
        except Exception as exc:
            raise RuntimeError(
                "Whisper transcription failed. Check that ffmpeg is installed and the model can be loaded."
            ) from exc
        return ProviderResult(
            transcript_text=(result.get("text") or "").strip(),
            provider_key=self.provider_key,
            metadata={"language": result.get("language")},
        )
