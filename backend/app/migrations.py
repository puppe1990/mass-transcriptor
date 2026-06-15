from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from sqlalchemy import inspect

from alembic import command


def upgrade_database(engine) -> None:
    backend_dir = Path(__file__).resolve().parent.parent
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", str(engine.url.render_as_string(hide_password=False)))

    with engine.connect() as connection:
        inspector = inspect(connection)
        has_version_table = inspector.has_table("alembic_version")
        has_app_tables = inspector.has_table("tenants")

    if has_app_tables and not has_version_table:
        command.stamp(config, "0001_initial_schema")

    command.upgrade(config, "head")
