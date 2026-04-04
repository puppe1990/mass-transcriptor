from __future__ import annotations

import json

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tenant, TenantProviderSetting
from app.services.secrets import decrypt_secret, encrypt_secret


def _get_setting(session: Session, tenant_id: int, provider_key: str) -> TenantProviderSetting | None:
    stmt = select(TenantProviderSetting).where(
        TenantProviderSetting.tenant_id == tenant_id,
        TenantProviderSetting.provider_key == provider_key,
    )
    return session.scalar(stmt)


def _upsert_setting(
    session: Session,
    tenant_id: int,
    provider_key: str,
    enabled: bool,
    config: dict[str, str] | None = None,
) -> TenantProviderSetting:
    setting = _get_setting(session, tenant_id, provider_key)
    if setting is None:
        setting = TenantProviderSetting(tenant_id=tenant_id, provider_key=provider_key)
    setting.enabled = 1 if enabled else 0
    setting.config_json = json.dumps(config or {})
    session.add(setting)
    session.commit()
    session.refresh(setting)
    return setting


def serialize_provider_settings(session: Session, tenant: Tenant) -> dict:
    assemblyai_setting = _get_setting(session, tenant.id, "assemblyai")
    assemblyai_config = json.loads(assemblyai_setting.config_json or "{}") if assemblyai_setting else {}
    return {
        "workspace_name": tenant.name,
        "default_provider": tenant.default_provider,
        "providers": {
            "whisper": {"enabled": True, "has_api_key": False},
            "assemblyai": {
                "enabled": bool(assemblyai_setting.enabled) if assemblyai_setting else False,
                "has_api_key": bool(assemblyai_config.get("api_key")) if assemblyai_setting else False,
            },
        },
    }


def update_provider_settings(
    session: Session,
    tenant: Tenant,
    workspace_name: str,
    default_provider: str,
    assemblyai_api_key: str | None,
) -> dict:
    normalized_workspace_name = workspace_name.strip()
    if not normalized_workspace_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Workspace name is required")

    normalized_provider = default_provider.strip().lower()
    if normalized_provider not in {"whisper", "assemblyai"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported provider")

    if assemblyai_api_key is not None:
        raw_key = assemblyai_api_key.strip()
        if raw_key:
            _upsert_setting(
                session,
                tenant.id,
                "assemblyai",
                enabled=True,
                config={"api_key": encrypt_secret(raw_key)},
            )

    if normalized_provider == "assemblyai" and resolve_assemblyai_api_key(session, tenant.id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AssemblyAI requires an API key for this workspace",
        )

    tenant.name = normalized_workspace_name
    tenant.default_provider = normalized_provider
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return serialize_provider_settings(session, tenant)


def resolve_assemblyai_api_key(session: Session, tenant_id: int) -> str | None:
    setting = _get_setting(session, tenant_id, "assemblyai")
    if setting is not None:
        config = json.loads(setting.config_json or "{}")
        encrypted_key = config.get("api_key")
        if encrypted_key:
            return decrypt_secret(encrypted_key)
    return None
