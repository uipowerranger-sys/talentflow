"""Add staff roles, job ownership, and employee to HR messaging."""
from alembic import op
import sqlalchemy as sa

revision = "0003_roles_messages"
down_revision = "0002_saved_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(length=160), nullable=True))
    op.execute("UPDATE users SET role = 'employee' WHERE role = 'candidate'")
    op.add_column("jobs", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.create_index("ix_jobs_created_by_user_id", "jobs", ["created_by_user_id"])
    op.create_foreign_key("fk_jobs_created_by_user_id_users", "jobs", "users", ["created_by_user_id"], ["id"], ondelete="SET NULL")
    op.create_table(
        "message_threads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_hr_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_message_threads_employee_id", "message_threads", ["employee_id"])
    op.create_index("ix_message_threads_assigned_hr_id", "message_threads", ["assigned_hr_id"])
    op.create_index("ix_message_threads_updated_at", "message_threads", ["updated_at"])
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messages_thread_id", "messages", ["thread_id"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_table("message_threads")
    op.drop_constraint("fk_jobs_created_by_user_id_users", "jobs", type_="foreignkey")
    op.drop_index("ix_jobs_created_by_user_id", table_name="jobs")
    op.drop_column("jobs", "created_by_user_id")
    op.drop_column("users", "full_name")
