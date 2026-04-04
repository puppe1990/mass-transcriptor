from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tenant


def normalize_tenant_slug(slug: str) -> str:
    return slug.strip().lower()


def get_tenant_by_slug(session: Session, tenant_slug: str) -> Tenant | None:
    normalized = normalize_tenant_slug(tenant_slug)
    return session.scalar(select(Tenant).where(Tenant.slug == normalized))
