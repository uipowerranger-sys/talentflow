"""Track skills extracted from uploaded resumes."""

from alembic import op
import sqlalchemy as sa


revision = "0004_resume_skill_source"
down_revision = "0003_roles_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidate_skills", sa.Column("source", sa.String(length=20), server_default="manual", nullable=False))


def downgrade() -> None:
    op.drop_column("candidate_skills", "source")
