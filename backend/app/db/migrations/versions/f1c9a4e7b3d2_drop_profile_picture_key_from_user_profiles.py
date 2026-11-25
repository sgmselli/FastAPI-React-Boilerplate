"""drop profile_picture_key from user_profiles

Revision ID: f1c9a4e7b3d2
Revises: e8b3c5f1a2d7
Create Date: 2026-11-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1c9a4e7b3d2'
down_revision: Union[str, None] = 'e8b3c5f1a2d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('user_profiles', 'profile_picture_key')


def downgrade() -> None:
    op.add_column(
        'user_profiles',
        sa.Column('profile_picture_key', sa.String(length=255), nullable=True),
    )
