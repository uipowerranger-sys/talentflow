"""Add managed job categories and remove company and location fields."""

from alembic import op
import sqlalchemy as sa


revision = "0005_job_catalog"
down_revision = "0004_resume_skill_source"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    op.create_table(
        "job_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
    )
    op.create_index("ix_job_categories_name", "job_categories", ["name"], unique=True)
    categories = connection.execute(sa.text("SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL AND category <> ''")).fetchall()
    for (name,) in categories:
        connection.execute(sa.text("INSERT INTO job_categories (name) VALUES (:name)"), {"name": name})
    indexes = {index["name"] for index in inspector.get_indexes("jobs")}
    columns = {column["name"] for column in inspector.get_columns("jobs")}
    for index in ("ix_jobs_location_category", "ix_jobs_location"):
        if index in indexes:
            op.drop_index(index, table_name="jobs")
    for column in ("company", "location"):
        if column in columns:
            op.drop_column("jobs", column)


def downgrade() -> None:
    op.add_column("jobs", sa.Column("company", sa.String(length=200), nullable=True))
    op.add_column("jobs", sa.Column("location", sa.String(length=160), nullable=True))
    op.create_index("ix_jobs_location", "jobs", ["location"], unique=False)
    op.create_index("ix_jobs_location_category", "jobs", ["location", "category"], unique=False)
    op.drop_index("ix_job_categories_name", table_name="job_categories")
    op.drop_table("job_categories")
