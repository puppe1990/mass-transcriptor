from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Tenant, TenantMembership
from app.services.tenancy import get_tenant_by_slug


def get_memberships_for_user(session: Session, user_id: int) -> list[TenantMembership]:
    stmt = (
        select(TenantMembership)
        .options(selectinload(TenantMembership.tenant))
        .where(TenantMembership.user_id == user_id)
    )
    return list(session.scalars(stmt))


def require_accessible_tenant(session: Session, user_id: int, tenant_slug: str) -> Tenant:
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    stmt = select(TenantMembership).where(
        TenantMembership.tenant_id == tenant.id,
        TenantMembership.user_id == user_id,
    )
    membership = session.scalar(stmt)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return tenant
