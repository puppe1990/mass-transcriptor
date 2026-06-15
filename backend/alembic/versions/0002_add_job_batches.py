"""add job batches

Revision ID: 0002_add_job_batches
Revises: 0001_initial_schema
Create Date: 2026-06-15
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0002_add_job_batches"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("job_batches"):
        op.create_table(
            "job_batches",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_job_batches_tenant_id", "job_batches", ["tenant_id"], unique=False)

    job_columns = {column["name"] for column in inspector.get_columns("transcription_jobs")}
    if "batch_id" not in job_columns:
        op.add_column("transcription_jobs", sa.Column("batch_id", sa.Integer(), nullable=True))
        op.create_index(
            "ix_transcription_jobs_batch_id", "transcription_jobs", ["batch_id"], unique=False
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    job_columns = {column["name"] for column in inspector.get_columns("transcription_jobs")}
    if "batch_id" in job_columns:
        op.drop_index("ix_transcription_jobs_batch_id", table_name="transcription_jobs")
        op.drop_column("transcription_jobs", "batch_id")

    if inspector.has_table("job_batches"):
        op.drop_index("ix_job_batches_tenant_id", table_name="job_batches")
        op.drop_table("job_batches")
