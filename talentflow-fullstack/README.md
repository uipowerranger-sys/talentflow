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

## Deployment notes

GitHub Pages cannot host the API, database, or worker. For a public deployment, host the containers on a service that supports Docker Compose or deploy the frontend, API, and worker separately; provision managed PostgreSQL, Redis, and private resume storage; and set secrets in the host's secret manager. Replace the local JWT secret, database credentials, and local resume storage before exposing the app publicly.
