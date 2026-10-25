"""add profile_picture_key to user_profiles

Revision ID: d4a7e2b9c1f3
Revises: c3f81d2a9e47
Create Date: 2026-10-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4a7e2b9c1f3'
down_revision: Union[str, None] = 'c3f81d2a9e47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'user_profiles',
        sa.Column('profile_picture_key', sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('user_profiles', 'profile_picture_key')
