"""Add candidate saved jobs."""
from alembic import op
import sqlalchemy as sa


revision = "0002_saved_jobs"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saved_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_saved_candidate_job"),
    )
    op.create_index("ix_saved_jobs_candidate_id", "saved_jobs", ["candidate_id"])
    op.create_index("ix_saved_jobs_job_id", "saved_jobs", ["job_id"])


def downgrade() -> None:
    op.drop_index("ix_saved_jobs_job_id", table_name="saved_jobs")
    op.drop_index("ix_saved_jobs_candidate_id", table_name="saved_jobs")
    op.drop_table("saved_jobs")
