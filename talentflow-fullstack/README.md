# TalentFlow full-stack app

This project combines the React/Vite frontend with a FastAPI API, PostgreSQL database, and Redis-backed resume worker. The frontend login and registration now use the API; job matching, candidate skills, resume upload, and applications use backend data.

## Run locally with Docker

1. Install Docker Desktop and make sure its engine is running.
2. From this folder, copy `.env.example` to `.env` and replace `JWT_SECRET_KEY` with a private random value.
3. Start the app with `docker compose up --build`.
4. Open [http://localhost:8080](http://localhost:8080), create an account, and sign in. Ten demo job listings are inserted automatically.
5. API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

The database and resume files persist in Docker volumes. Stop the services with `docker compose down`; use `docker compose down -v` only when you intend to erase that local data.

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

**Internal access:** the current app allows anyone who can reach the site to register an account. CORS does not restrict access to the API. Render URLs are internet-accessible, so do not store employee or resume data until the site is protected by your company SSO, VPN, or an access gateway and account registration is restricted to authorized employees.

During Blueprint setup, provide these values when prompted:

- `CORS_ORIGINS`: the exact frontend origin, for example `https://talentflow-frontend.onrender.com` (no trailing slash).
- `VITE_API_BASE_URL`: the API origin plus `/api`, for example `https://talentflow-api.onrender.com/api`.
- `AZURE_STORAGE_CONNECTION_STRING`: the secret connection string for an Azure Blob Storage account. The backend and resume worker share this value. Resume uploads must use persistent external storage because Render service filesystems are ephemeral and a disk attached to one service cannot be shared with the other.

The API and worker use `backend/` as their root directory. The API installs `requirements.txt`; its start command runs Alembic migrations, inserts the demo jobs, and starts Uvicorn on Render's `$PORT`. The frontend uses `frontend/`, runs `npm ci && npm run build`, and publishes `dist/`. `VITE_API_BASE_URL` is a Vite build-time variable, so set it before the frontend build. The API accepts both PostgreSQL URL schemes and adapts Render's connection string to the installed `psycopg` driver.

After deployment, check `https://<api-host>/health` for `{"status":"ok"}`, then open the frontend URL, register a new account, sign in, and upload a PDF or DOCX resume. The `/` route fallback is configured for React Router. Do not use GitHub Pages for this app: it cannot run the API, database, or worker.

All secrets belong in the hosting provider's secret manager, not GitHub. The root `.gitignore` excludes `.env` files and local npm caches while allowing the `.env.example` templates.
