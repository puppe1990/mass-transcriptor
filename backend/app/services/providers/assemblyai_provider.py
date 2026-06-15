from __future__ import annotations

import assemblyai as aai

from app.services.providers.base import ProviderResult, TranscriptionProvider

# Match the AssemblyAI dashboard default: Universal-3-Pro with Universal-2 fallback.
_ASSEMBLYAI_SPEECH_MODELS = ["universal-3-pro", "universal-2"]

_LANGUAGE_CODE_MAP = {
    "pt": "pt",
    "en": "en",
    "es": "es",
}


class AssemblyAiProvider(TranscriptionProvider):
    provider_key = "assemblyai"

    def __init__(self, api_key: str, language: str | None = None) -> None:
        self.api_key = api_key
        self.language = language
        aai.settings.api_key = api_key

    def _build_config(self) -> aai.TranscriptionConfig:
        base_kwargs = {"speech_models": _ASSEMBLYAI_SPEECH_MODELS}
        if self.language:
            language_code = _LANGUAGE_CODE_MAP.get(self.language, self.language)
            return aai.TranscriptionConfig(language_code=language_code, **base_kwargs)
        return aai.TranscriptionConfig(language_detection=True, **base_kwargs)

    def transcribe(self, file_path: str) -> ProviderResult:
        config = self._build_config()
        try:
            transcript = aai.Transcriber().transcribe(file_path, config=config)
        except Exception as exc:
            raise RuntimeError(
                "AssemblyAI transcription failed. Check your API key and network access."
            ) from exc
        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(transcript.error or "AssemblyAI transcription failed")
        metadata = {"id": transcript.id}
        if transcript.language_code:
            metadata["language_code"] = transcript.language_code
        return ProviderResult(
            transcript_text=transcript.text or "",
            provider_key=self.provider_key,
            metadata=metadata,
        )
