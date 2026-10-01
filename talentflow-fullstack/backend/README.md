# TalentFlow FastAPI backend

Modular FastAPI backend using PostgreSQL, SQLAlchemy 2.x, Alembic, JWT authentication, and a route → service → repository → database flow.

## Start locally

1. Create a virtual environment and install dependencies: `python -m venv .venv` then `pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` and set a strong `JWT_SECRET_KEY`.
3. Start PostgreSQL and Redis with `docker compose up -d db redis`.
4. Run migrations with `alembic upgrade head`.
5. Start the API with `uvicorn app.main:app --reload`.
6. Open `http://localhost:8000/docs`.

The jobs table starts empty. Create an HR account through the Admin flow and post a job from the HR portal. Employee job listings are queried from PostgreSQL and show jobs posted by HR; no demo job seed runs at startup.

## Main routes

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/jobs`, `GET /api/jobs/recommended`, `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/match`, `POST /api/jobs/{job_id}/apply`
- `GET /api/candidates/me`, `GET/POST /api/candidates/me/skills`, `DELETE /api/candidates/me/skills/{skill_id}`
- `POST /api/resumes/upload`, `GET /api/resumes/status/{resume_id}`
- `POST /api/hr/jobs`, `GET /api/hr/jobs`, `PUT/DELETE /api/hr/jobs/{job_id}`
- `PUT /api/hr/applications/{application_id}/status` to select an applicant and close that job

## Notes

The API does not seed demo users or jobs. Resume files use local storage for development and Azure Blob Storage when `AZURE_STORAGE_CONNECTION_STRING` is configured. Resume extraction supports PDF and DOCX; legacy DOC files are accepted for storage but are not parsed. Redis is provisioned for future caching/background queue integration; current resume processing uses FastAPI background tasks. Set production secrets, CORS origins, rate limiting, audit retention, and Azure access policy before deployment.
