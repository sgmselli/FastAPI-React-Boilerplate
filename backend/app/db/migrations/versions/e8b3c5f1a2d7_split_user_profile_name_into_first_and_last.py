"""split user_profiles name into first_name and last_name

Revision ID: e8b3c5f1a2d7
Revises: d4a7e2b9c1f3
Create Date: 2026-11-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8b3c5f1a2d7'
down_revision: Union[str, None] = 'd4a7e2b9c1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_profiles', sa.Column('first_name', sa.String(length=50), nullable=True))
    op.add_column('user_profiles', sa.Column('last_name', sa.String(length=50), nullable=True))
    op.drop_column('user_profiles', 'name')


def downgrade() -> None:
    op.add_column('user_profiles', sa.Column('name', sa.String(length=200), nullable=True))
    op.drop_column('user_profiles', 'last_name')
    op.drop_column('user_profiles', 'first_name')
