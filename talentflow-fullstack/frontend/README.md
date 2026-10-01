# TalentFlow frontend

A React 18 + TypeScript + Vite front-end starter for the TalentFlow employee experience.

## Run locally

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` to create a production bundle in `dist/`.

## Routes

- `/login` — sign in. A valid form submission stores a demo session and redirects to `/jobs`.
- `/register` — create a demo account, then continue to `/login`.
- `/jobs` — job search, filters, match details, resume prompt, and skills panel.

## Data source

This frontend uses the FastAPI API for authentication, jobs, and employee data. The job list starts empty; an HR user must post a job through the HR portal before employees can see it. Employer identity details are intentionally omitted from job cards and the match details view.

## Structure

```text
src/
  app/                 App providers and routes
  components/          Shared header, auth layout, and job UI
  features/
    auth/               Login and registration pages
    jobs/               Search page and query hook
    profile/            Candidate skills UI
    resume/             Local resume selection UI
  lib/                  TanStack Query client
  store/                Redux store and demo auth slice
  styles/               Global theme and responsive styles
  types/                Shared TypeScript models
```
