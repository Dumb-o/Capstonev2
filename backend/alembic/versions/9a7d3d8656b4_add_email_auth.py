"""add_email_auth

Revision ID: 9a7d3d8656b4
Revises: 001
Create Date: 2026-05-21 22:16:31.604595
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = '9a7d3d8656b4'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('auth_method', sa.String(length=20),
        nullable=False, server_default='wallet'))
    op.alter_column('users', 'wallet_address',
        existing_type=sa.VARCHAR(length=42),
        nullable=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.alter_column('users', 'wallet_address',
        existing_type=sa.VARCHAR(length=42),
        nullable=False)
    op.drop_column('users', 'auth_method')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'email')
