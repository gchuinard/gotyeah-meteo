"""Widen preferences.unit_system to store serialized unit preferences

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-14 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # unit_system stocke désormais un JSON sérialisé des préférences d'unités
    op.alter_column(
        "preferences",
        "unit_system",
        existing_type=sa.String(length=20),
        type_=sa.String(length=255),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "preferences",
        "unit_system",
        existing_type=sa.String(length=255),
        type_=sa.String(length=20),
        existing_nullable=False,
    )
