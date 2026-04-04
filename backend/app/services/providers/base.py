from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProviderResult:
    transcript_text: str
    provider_key: str
    metadata: dict


class TranscriptionProvider:
    provider_key: str

    def transcribe(self, file_path: str) -> ProviderResult:
        raise NotImplementedError
