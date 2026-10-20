"""create one time password table and add email_verified_at to users

Revision ID: c3f81d2a9e47
Revises: 6eb5172865c3
Create Date: 2026-10-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3f81d2a9e47'
down_revision: Union[str, None] = '6eb5172865c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('one_time_passwords',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_one_time_passwords_id'), 'one_time_passwords', ['id'], unique=False)
    op.create_index(op.f('ix_one_time_passwords_user_id'), 'one_time_passwords', ['user_id'], unique=False)

    op.add_column(
        'users',
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Existing users registered before verification existed - treat them as
    # verified so they aren't locked out on their next login.
    op.execute("UPDATE users SET email_verified_at = created_at")


def downgrade() -> None:
    op.drop_column('users', 'email_verified_at')

    op.drop_index(op.f('ix_one_time_passwords_user_id'), table_name='one_time_passwords')
    op.drop_index(op.f('ix_one_time_passwords_id'), table_name='one_time_passwords')
    op.drop_table('one_time_passwords')
