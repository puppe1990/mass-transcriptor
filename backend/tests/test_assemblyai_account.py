from unittest.mock import MagicMock

import httpx

from app.services.assemblyai_account import fetch_assemblyai_credits


def test_fetch_assemblyai_credits_not_configured():
    info = fetch_assemblyai_credits(None)

    assert info.status == "not_configured"
    assert info.balance_usd is None


def test_fetch_assemblyai_credits_parses_balance(monkeypatch):
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"balance": 42.5}

    monkeypatch.setattr(
        httpx,
        "get",
        lambda *args, **kwargs: response,
    )

    info = fetch_assemblyai_credits("server-api-key")

    assert info.status == "available"
    assert info.balance_usd == 42.5


def test_fetch_assemblyai_credits_unavailable_when_account_empty(monkeypatch):
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {}

    monkeypatch.setattr(
        httpx,
        "get",
        lambda *args, **kwargs: response,
    )

    info = fetch_assemblyai_credits("server-api-key")

    assert info.status == "unavailable"
    assert info.balance_usd is None
    assert info.message is not None


def test_fetch_assemblyai_credits_invalid_key(monkeypatch):
    response = MagicMock()
    response.status_code = 401

    monkeypatch.setattr(
        httpx,
        "get",
        lambda *args, **kwargs: response,
    )

    info = fetch_assemblyai_credits("bad-key")

    assert info.status == "error"
    assert info.message == "Invalid AssemblyAI API key"
