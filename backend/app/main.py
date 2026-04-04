from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.db import Base, SessionLocal, engine
from app.models import Tenant


def seed_default_tenant() -> None:
    with SessionLocal() as session:
        exists = session.query(Tenant).filter(Tenant.slug == "acme").first()
        if exists is None:
            session.add(Tenant(slug="acme", name="Acme", default_provider="whisper"))
            session.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_default_tenant()
    yield


app = FastAPI(title="Mass Transcriptor API", lifespan=lifespan)
app.include_router(router)
