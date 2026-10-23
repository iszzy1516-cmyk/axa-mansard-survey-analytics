# AXA Mansard — Survey Call Analytics Platform

API + auth for the Survey Call Analytics platform. AXA Mansard staff (admins and
supervisors) log in to view dashboards and reports over IVR survey call data.
Admins additionally manage users.

## Architecture

- **IVR database (MariaDB, read-only):** survey call data — queried live by the API.
  Column layouts mirror the upstream IVR schema (`survey_request`,
  `survey_requestdetails`, `survey_response`, `survey_requestfiltered`,
  `survey_request_latest`), including microsecond timestamps (`DATETIME(6)`).
  For local development, `docker compose up -d` starts a MariaDB simulator and
  `scripts/seed_demo_data.py` fills it with ~3 weeks of Health-skillset data.
  Pointing at the real IVR database only requires changing `IVR_DATABASE_URL`.
- **Platform database (MariaDB, writable):** `users` (email, role, Argon2id password
  hash), `report_runs` (scheduled report history/status).
- **API:** FastAPI. JWT auth, Argon2id password hashing, rate-limited login.

Roles: `admin` (dashboard, reports, user management, settings) and `supervisor`
(dashboard, reports only).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# local dev: start the simulated MariaDB and seed demo IVR data
docker compose up -d
cp .env.example .env
python scripts/seed_demo_data.py

# one-time: create platform tables + first admin
python scripts/init_db.py --admin-email you@axamansard.com --admin-password '...'

uvicorn app.main:app --reload
```

## Layout

```
app/
  config.py           # settings (env-driven)
  database.py         # two engines: IVR (read-only), platform (writable)
  main.py             # app factory, rate limiter, routers
  auth/               # login, Argon2id, JWT, current-user dependencies
  users/              # admin-only user CRUD
  dashboard/          # KPIs, charts, customer table
  reports/            # report queries + Excel/CSV export
```
