"""add threads and notifications tables

Revision ID: 004
Revises: 003
Create Date: 2026-06-19
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "threads",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("client_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("freelancer_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("job_id", sa.String, sa.ForeignKey("jobs.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("client_id", "freelancer_id", "job_id", name="uq_thread_client_freelancer_job"),
    )
    op.create_table(
        "notifications",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, server_default="false"),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Index("idx_notifications_user_read", "user_id", "is_read"),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("threads")
