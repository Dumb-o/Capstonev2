"""add missing model fields (headline, experience_level, etc.)

Revision ID: 003
Revises: 9a7d3d8656b4
Create Date: 2026-06-16
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "9a7d3d8656b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("headline", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("experience_level", sa.String(20),
                  server_default="mid"))
    op.add_column("users", sa.Column("industries", sa.JSON, nullable=True))
    op.add_column("users", sa.Column("is_available", sa.Boolean,
                  server_default="true"))
    op.add_column("users", sa.Column("portfolio_cids", sa.JSON, nullable=True))
    op.add_column("proposals", sa.Column("contract_id", sa.String, nullable=True))
    op.create_index("ix_proposals_contract_id", "proposals", ["contract_id"])


def downgrade() -> None:
    op.drop_index("ix_proposals_contract_id", table_name="proposals")
    op.drop_column("proposals", "contract_id")
    op.drop_column("users", "portfolio_cids")
    op.drop_column("users", "is_available")
    op.drop_column("users", "industries")
    op.drop_column("users", "experience_level")
    op.drop_column("users", "headline")
