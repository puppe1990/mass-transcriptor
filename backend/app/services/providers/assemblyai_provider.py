from __future__ import annotations

import assemblyai as aai

from app.services.providers.base import ProviderResult, TranscriptionProvider


class AssemblyAiProvider(TranscriptionProvider):
    provider_key = "assemblyai"

    def __init__(self, api_key: str) -> None:
        aai.settings.api_key = api_key

    def transcribe(self, file_path: str) -> ProviderResult:
        transcript = aai.Transcriber().transcribe(file_path)
        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(transcript.error or "AssemblyAI transcription failed")
        return ProviderResult(
            transcript_text=transcript.text or "",
            provider_key=self.provider_key,
            metadata={"id": transcript.id},
        )
