"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, UUID

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("username", sa.String(100), nullable=True),
        sa.Column("wallet_address", sa.String(42), unique=True, nullable=False, index=True),
        sa.Column("role", sa.String(20), server_default="freelancer"),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("skills", JSON, default=list),
        sa.Column("hourly_rate", sa.Float, server_default="0"),
        sa.Column("rating", sa.Float, server_default="0"),
        sa.Column("avatar_cid", sa.String, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("client_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("budget", sa.Float, nullable=False),
        sa.Column("category", sa.String(100), nullable=True, index=True),
        sa.Column("skills", JSON, default=list),
        sa.Column("duration_days", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), server_default="open", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "proposals",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, sa.ForeignKey("jobs.id"), nullable=False, index=True),
        sa.Column("freelancer_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("cover_letter", sa.Text, nullable=True),
        sa.Column("bid_amount", sa.Float, nullable=False),
        sa.Column("estimated_days", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("job_id", "freelancer_id", name="uq_job_freelancer"),
    )

    op.create_table(
        "contracts",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, sa.ForeignKey("jobs.id"), nullable=True, index=True),
        sa.Column("client_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("freelancer_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("total_amount", sa.Float, nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("terms_cid", sa.String, nullable=True),
        sa.Column("on_chain_id", sa.Integer, nullable=True),
        sa.Column("contract_address", sa.String(42), nullable=True),
        sa.Column("status", sa.String(20), server_default="draft", index=True),
        sa.Column("client_signed", sa.Boolean, server_default="false"),
        sa.Column("freelancer_signed", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "contract_milestones",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("contract_id", sa.String, sa.ForeignKey("contracts.id"), nullable=False, index=True),
        sa.Column("index", sa.Integer, nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("amount", sa.Float, nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deliverable_cid", sa.String, nullable=True),
        sa.Column("submission_notes", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("contract_id", "index", name="uq_contract_milestone_index"),
    )

    op.create_table(
        "disputes",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("contract_id", sa.String, sa.ForeignKey("contracts.id"), nullable=False, unique=True, index=True),
        sa.Column("raised_by", sa.String, nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), server_default="open", index=True),
        sa.Column("decision", sa.String(20), nullable=True),
        sa.Column("resolved_by", sa.String, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolution_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("sender_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("receiver_id", sa.String, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("read", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("idx_messages_conversation", "messages", ["sender_id", "receiver_id"])

    op.create_table(
        "admin_accounts",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("role", sa.String(50), server_default="admin"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("admin_accounts")
    op.drop_table("messages")
    op.drop_table("disputes")
    op.drop_table("contract_milestones")
    op.drop_table("contracts")
    op.drop_table("proposals")
    op.drop_table("jobs")
    op.drop_table("users")
