"""create audit_logs table

Revision ID: 0001_create_audit_logs
Revises: 
Create Date: 2025-11-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_create_audit_logs"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("user_id", sa.String(length=128), nullable=True),
    )


def downgrade():
    op.drop_table("audit_logs")
