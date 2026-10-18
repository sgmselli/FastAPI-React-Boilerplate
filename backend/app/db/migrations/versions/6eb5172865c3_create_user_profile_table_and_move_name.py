"""create user profile table and move name from users to user_profiles

Revision ID: 6eb5172865c3
Revises: b7713f2addc3
Create Date: 2026-10-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6eb5172865c3'
down_revision: Union[str, None] = 'b7713f2addc3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('user_profiles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_profiles_id'), 'user_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)

    # Every existing user gets a profile carrying the name they registered with.
    op.execute("""
        INSERT INTO user_profiles (user_id, name, created_at, updated_at)
        SELECT id, name, created_at, CURRENT_TIMESTAMP
        FROM users
    """)

    op.drop_column('users', 'name')


def downgrade() -> None:
    op.add_column(
        'users',
        sa.Column('name', sa.String(length=200), nullable=True),
    )

    # users.name was NOT NULL, so profiles that were never completed fall back
    # to an empty string.
    op.execute("""
        UPDATE users
        SET name = COALESCE(user_profiles.name, '')
        FROM user_profiles
        WHERE user_profiles.user_id = users.id
    """)
    op.execute("UPDATE users SET name = '' WHERE name IS NULL")

    op.alter_column(
        'users',
        'name',
        existing_type=sa.String(length=200),
        nullable=False,
    )

    op.drop_index(op.f('ix_user_profiles_user_id'), table_name='user_profiles')
    op.drop_index(op.f('ix_user_profiles_id'), table_name='user_profiles')
    op.drop_table('user_profiles')
