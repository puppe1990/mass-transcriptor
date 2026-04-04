from __future__ import annotations

from pathlib import Path

from app.config import Settings

settings = Settings()


def build_upload_dir(tenant_slug: str, upload_id: int) -> Path:
    return Path(settings.storage_root) / tenant_slug / "uploads" / str(upload_id)


def build_audio_path(tenant_slug: str, upload_id: int, filename: str) -> Path:
    return build_upload_dir(tenant_slug, upload_id) / "audio" / filename


def build_markdown_path(tenant_slug: str, upload_id: int) -> Path:
    return build_upload_dir(tenant_slug, upload_id) / "transcript" / "transcript.md"


def write_audio_bytes(tenant_slug: str, upload_id: int, filename: str, content: bytes) -> str:
    path = build_audio_path(tenant_slug, upload_id, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return str(path)


def write_markdown(tenant_slug: str, upload_id: int, content: str) -> str:
    path = build_markdown_path(tenant_slug, upload_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return str(path)
