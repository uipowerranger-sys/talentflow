# TalentFlow full-stack app

TalentFlow is a role-based internal employee experience application. React/Vite uses the FastAPI API, PostgreSQL for application data, and Redis/RQ for resume analysis. Employee profiles, jobs, match results, saved jobs, applications, and conversations are database-backed.

## Roles and first sign-in

- **Admin:** created once from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`; admins can create HR accounts.
- **HR:** provisioned by an admin; HR users can publish jobs, review employee profiles/resume text/applications, and reply to employee messages.
- **Employee:** self-registers and gets employee access; employees can search jobs, upload a resume, see profile match scores, save jobs, apply when eligible, and message HR.

The API enforces these roles independently of frontend navigation. Do not register HR/admin accounts through the employee registration page.

## Run locally with Docker

1. Install Docker Desktop and make sure its engine is running.
2. From this folder, copy `.env.example` to `.env`. Set a private random `JWT_SECRET_KEY`, `INITIAL_ADMIN_EMAIL`, and a unique `INITIAL_ADMIN_PASSWORD` with at least 12 characters.
3. Start the app with `docker compose up --build`.
4. Open [http://localhost:8080](http://localhost:8080). Sign in as the configured admin and create HR accounts. Employees can register from the sign-in screen. Ten starter job records are inserted into PostgreSQL for local evaluation.
5. API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

The database and local resume files persist in Docker volumes. Stop the services with `docker compose down`; use `docker compose down -v` only when you intend to erase that local data.

## Run frontend without its container

Start the database and API using Docker Compose, then from `frontend/` run `npm ci` and `npm run dev`. Vite forwards `/api` requests to `http://localhost:8000`.

## Project layout

```text
frontend/   React, TypeScript, Vite, Nginx container
backend/    FastAPI, SQLAlchemy, Alembic migrations, resume parsing
docker-compose.yml   frontend, API, PostgreSQL, Redis, resume worker
```

## Deploy to Render

This repository includes a root-level `render.yaml` Blueprint for the frontend, FastAPI API, PostgreSQL database, Redis-compatible queue, and resume worker. From the Render dashboard, choose **New > Blueprint**, connect this GitHub repository, and review the resources and any charges before creating them.

Employee self-registration is enabled. HR and Admin roles are provisioned through the role-controlled admin flow; the API rejects requests to staff endpoints from other roles. For company deployment, set the frontend/API URLs to your approved internal access gateway and use a company-approved identity/access policy.

During Blueprint setup, provide these values when prompted:

- `CORS_ORIGINS`: the exact frontend origin, for example `https://talentflow-frontend.onrender.com` (no trailing slash).
- `VITE_API_BASE_URL`: the API origin plus `/api`, for example `https://talentflow-api.onrender.com/api`.
- `AZURE_STORAGE_CONNECTION_STRING`: the secret connection string for an Azure Blob Storage account. The backend and resume worker share this value. Resume uploads must use persistent external storage because Render service filesystems are ephemeral and a disk attached to one service cannot be shared with the other.
- `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`: the first Admin account credentials, stored as Render secrets. The bootstrap command creates this account only when it does not already exist; it never prints the password.

The API and worker use `backend/` as their root directory. The API installs `requirements.txt`; its start command runs Alembic migrations, inserts the starter jobs, bootstraps the initial Admin if configured, and starts Uvicorn on Render's `$PORT`. The frontend uses `frontend/`, runs `npm ci && npm run build`, and publishes `dist/`. `VITE_API_BASE_URL` is a Vite build-time variable, so set it before the frontend build. The API accepts both PostgreSQL URL schemes and adapts Render's connection string to the installed `psycopg` driver.

After deployment, check `https://<api-host>/health` for `{"status":"ok"}`, sign in with the configured Admin, create HR accounts, then register an employee and upload a PDF or DOCX resume. The `/` route fallback is configured for React Router. Do not use GitHub Pages for this app: it cannot run the API, database, or worker.

All secrets belong in the hosting provider's secret manager, not GitHub. The root `.gitignore` excludes `.env` files and local npm caches while allowing the `.env.example` templates.
