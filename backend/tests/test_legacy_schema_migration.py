import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app.migrations import upgrade_database


def _create_legacy_schema(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE tenants (
            id INTEGER PRIMARY KEY,
            slug VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            default_provider VARCHAR(50) NOT NULL DEFAULT 'assemblyai',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        );
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        );
        CREATE TABLE tenant_memberships (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'owner',
            created_at DATETIME NOT NULL
        );
        CREATE TABLE uploads (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            size_bytes INTEGER NOT NULL,
            audio_path VARCHAR(500) NOT NULL,
            created_at DATETIME NOT NULL
        );
        CREATE TABLE transcription_jobs (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            upload_id INTEGER NOT NULL UNIQUE,
            provider_key VARCHAR(50) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'queued',
            error_message VARCHAR(500),
            started_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        );
        CREATE TABLE job_batches (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            created_at DATETIME NOT NULL
        );
        """
    )
    conn.close()


def test_legacy_schema_migration_adds_batch_id_column(tmp_path):
    db_path = tmp_path / "legacy.db"
    _create_legacy_schema(db_path)
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )

    upgrade_database(engine)

    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("transcription_jobs")}
    assert "batch_id" in columns
