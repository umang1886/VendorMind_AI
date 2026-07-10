"""Add ChatMessage model

Revision ID: 0ae466ea571b
Revises: f79ddd0d5464
Create Date: 2026-07-10 12:11:23.615283

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0ae466ea571b'
down_revision: Union[str, Sequence[str], None] = 'f79ddd0d5464'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create chat_messages table matching Supabase UUID columns."""
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('rfq_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('role', sa.Enum('user', 'assistant', 'system', name='chatmessageroleenum', create_type=True), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['rfq_id'], ['rfqs.id']),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('chat_messages')
    op.execute("DROP TYPE IF EXISTS chatmessageroleenum")
