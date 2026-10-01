"""Create the initial TalentFlow schema."""
from alembic import op

from app.models import Base

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = [table for table in Base.metadata.sorted_tables if table.name != "saved_jobs"]
    Base.metadata.create_all(bind=op.get_bind(), tables=tables)


def downgrade() -> None:
    tables = [table for table in Base.metadata.sorted_tables if table.name != "saved_jobs"]
    Base.metadata.drop_all(bind=op.get_bind(), tables=tables)
