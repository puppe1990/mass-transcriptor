from __future__ import annotations

from dataclasses import dataclass

import httpx

ASSEMBLYAI_ACCOUNT_URL = "https://api.assemblyai.com/v2/account"
ASSEMBLYAI_BILLING_DASHBOARD_URL = "https://www.assemblyai.com/dashboard/account/billing"

_BALANCE_KEYS = (
    "balance",
    "account_balance",
    "credit_balance",
    "credits",
    "remaining_credits",
    "balance_usd",
    "available_balance",
)


@dataclass(frozen=True)
class AssemblyAiCreditsInfo:
    status: str
    balance_usd: float | None = None
    message: str | None = None
    dashboard_url: str = ASSEMBLYAI_BILLING_DASHBOARD_URL


def _coerce_usd(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        stripped = value.strip().replace("$", "").replace(",", "")
        if not stripped:
            return None
        try:
            return float(stripped)
        except ValueError:
            return None
    return None


def _extract_balance(payload: dict[str, object]) -> float | None:
    for key in _BALANCE_KEYS:
        if key not in payload:
            continue
        balance = _coerce_usd(payload[key])
        if balance is not None:
            return balance
    return None


def fetch_assemblyai_credits(api_key: str | None) -> AssemblyAiCreditsInfo:
    if not api_key:
        return AssemblyAiCreditsInfo(status="not_configured")

    try:
        response = httpx.get(
            ASSEMBLYAI_ACCOUNT_URL,
            headers={"authorization": api_key.strip()},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        return AssemblyAiCreditsInfo(status="error", message=str(exc))

    if response.status_code == 401:
        return AssemblyAiCreditsInfo(status="error", message="Invalid AssemblyAI API key")

    if response.status_code != 200:
        return AssemblyAiCreditsInfo(
            status="error",
            message=f"AssemblyAI account request failed with status {response.status_code}",
        )

    try:
        payload = response.json()
    except ValueError:
        return AssemblyAiCreditsInfo(
            status="error", message="AssemblyAI account response was not JSON"
        )

    if not isinstance(payload, dict):
        return AssemblyAiCreditsInfo(
            status="unavailable", message="Unexpected AssemblyAI account response"
        )

    balance = _extract_balance(payload)
    if balance is not None:
        return AssemblyAiCreditsInfo(status="available", balance_usd=balance)

    return AssemblyAiCreditsInfo(
        status="unavailable",
        message=(
            "AssemblyAI does not expose account balance via API. "
            "Open the billing dashboard to see your remaining credits."
        ),
    )


def serialize_assemblyai_credits(info: AssemblyAiCreditsInfo) -> dict[str, object]:
    return {
        "status": info.status,
        "balance_usd": info.balance_usd,
        "message": info.message,
        "dashboard_url": info.dashboard_url,
    }
