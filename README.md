# AXA Mansard — Survey Call Analytics Platform

API + auth for the Survey Call Analytics platform. AXA Mansard staff (admins and
supervisors) log in to view dashboards and reports over IVR survey call data.
Admins additionally manage users.

## Architecture

- **IVR database (MariaDB, read-only):** survey call data — queried live by the API.
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
cp .env.example .env   # fill in real values

# one-time: create platform tables + first admin (needs PLATFORM_DATABASE_URL set)
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
