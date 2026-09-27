# TalentFlow FastAPI backend

Modular FastAPI backend using PostgreSQL, SQLAlchemy 2.x, Alembic, JWT authentication, and a route → service → repository → database flow.

## Start locally

1. Create a virtual environment and install dependencies: `python -m venv .venv` then `pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` and set a strong `JWT_SECRET_KEY`.
3. Start PostgreSQL and Redis with `docker compose up -d db redis`.
4. Run migrations with `alembic upgrade head`.
5. Optionally seed sample roles with `python -m scripts.seed_demo`.
6. Start the API with `uvicorn app.main:app --reload`.
7. Open `http://localhost:8000/docs`.

## Main routes

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/jobs`, `GET /api/jobs/recommended`, `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/match`, `POST /api/jobs/{job_id}/apply`
- `GET /api/candidates/me`, `GET/POST /api/candidates/me/skills`, `DELETE /api/candidates/me/skills/{skill_id}`
- `POST /api/resumes/upload`, `GET /api/resumes/status/{resume_id}`

## Notes

The API has no seeded users; register through the API and optionally add ten sample roles with the seed script. Resume files use local storage for development and Azure Blob Storage when `AZURE_STORAGE_CONNECTION_STRING` is configured. Resume extraction supports PDF and DOCX; legacy DOC files are accepted for storage but are not parsed. Redis is provisioned for future caching/background queue integration; current resume processing uses FastAPI background tasks. Set production secrets, CORS origins, rate limiting, audit retention, and Azure access policy before deployment.
