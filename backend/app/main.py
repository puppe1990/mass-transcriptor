from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.db import engine
from app.migrations import upgrade_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    upgrade_database(engine)
    yield


app = FastAPI(title="Mass Transcriptor API", lifespan=lifespan)
app.include_router(router, prefix="/api")
