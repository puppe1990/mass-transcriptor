from unittest.mock import patch

from app.services.providers.registry import get_provider


def test_get_provider_returns_whisper_provider():
    provider = get_provider("whisper")
    assert provider.provider_key == "whisper"


@patch("app.services.providers.registry.Settings")
def test_get_provider_returns_assemblyai_provider(settings_cls):
    settings_cls.return_value.assemblyai_api_key = "test-key"
    provider = get_provider("assemblyai")
    assert provider.provider_key == "assemblyai"
