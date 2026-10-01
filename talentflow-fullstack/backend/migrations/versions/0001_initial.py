"""Create the initial TalentFlow schema."""
from alembic import op
from sqlalchemy import MetaData

from app.models import Base

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def _initial_metadata() -> MetaData:
    metadata = MetaData()
    later_tables = {"saved_jobs", "message_threads", "messages", "job_categories"}
    later_columns = {"users": {"full_name"}, "jobs": {"created_by_user_id"}, "candidate_skills": {"source"}}
    for table in Base.metadata.sorted_tables:
        if table.name in later_tables:
            continue
        columns = [column.name for column in table.columns if column.name not in later_columns.get(table.name, set())]
        table.to_metadata(metadata, include_columns=columns)
    return metadata


def upgrade() -> None:
    _initial_metadata().create_all(bind=op.get_bind())


def downgrade() -> None:
    _initial_metadata().drop_all(bind=op.get_bind())
