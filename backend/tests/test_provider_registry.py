from unittest.mock import patch

import pytest

from app.services.providers.registry import get_provider
from app.services.providers.whisper_provider import WhisperProvider


def test_get_provider_returns_whisper_provider():
    provider = get_provider("whisper")
    assert provider.provider_key == "whisper"


def test_get_provider_returns_assemblyai_provider():
    provider = get_provider("assemblyai", api_key="test-key")
    assert provider.provider_key == "assemblyai"


def test_get_provider_requires_assemblyai_key():
    with pytest.raises(RuntimeError, match="ASSEMBLYAI_API_KEY"):
        get_provider("assemblyai")


@patch("app.services.providers.whisper_provider.whisper.load_model")
def test_whisper_provider_caches_loaded_model(load_model):
    class DummyModel:
        def transcribe(self, file_path: str) -> dict:
            return {"text": f"Transcript for {file_path}", "language": "en"}

    load_model.return_value = DummyModel()

    provider = WhisperProvider()
    first = provider.transcribe("/tmp/first.wav")
    second = provider.transcribe("/tmp/second.wav")

    assert first.transcript_text == "Transcript for /tmp/first.wav"
    assert second.transcript_text == "Transcript for /tmp/second.wav"
    load_model.assert_called_once()
