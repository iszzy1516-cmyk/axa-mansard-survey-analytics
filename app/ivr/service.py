"""Shared query helpers for the IVR read models.

The dashboard and reports routers both aggregate over the same five upstream
IVR tables. This module owns the cross-cutting concerns:

* timezone conversion between API boundaries (UTC ISO-8601) and the naive
  wall-clock DATETIME(6) values stored in the IVR database
  (``settings.ivr_database_timezone``);
* supervisor team scoping — a supervisor only sees rows whose IVR supervisor
  (``supervisorgivenname`` + ``supervisorsurname``) matches their own full
  name from the platform ``users`` table. This name match is a deliberate
  simulator assumption until AXA confirms the real team mapping; admins see
  every row;
* the word-based customer_rating scale used by the IVR ("Very Satisfied" …)
  mapped to the 1–5 numeric scale the frontend renders.

The IVR tables carry no customer-name or agent-email columns; agent emails
are synthesised as ``<initial>.<surname>@axamansard.com`` (matching the
format the survey platform uses) and customer names / survey questions are
returned as empty strings rather than invented.
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement, func

from app.config import settings
from app.ivr.models import SurveyRequestDetails
from app.users.models import User

DB_TZ = ZoneInfo(settings.ivr_database_timezone)

RATING_TO_SCORE: dict[str, int] = {
    "Very Satisfied": 5,
    "Satisfied": 4,
    "Neutral": 3,
    "Dissatisfied": 2,
    "Very Dissatisfied": 1,
}

# The upstream IVR extract does not include per-request survey question text;
# dashboard rows are returned with an empty question (see module docstring).


def parse_iso(value: str) -> datetime:
    """Parse an ISO-8601 timestamp (API boundary) to a naive DB-local datetime."""
    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    dt = datetime.fromisoformat(v)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(DB_TZ).replace(tzinfo=None)


def ms(dt: datetime) -> int:
    """Epoch milliseconds for a naive DB-local datetime."""
    return int(dt.replace(tzinfo=DB_TZ).timestamp() * 1000)


def ms_to_db(epoch_ms: int) -> datetime:
    """Inverse of :func:`ms` — epoch milliseconds to naive DB-local datetime."""
    return datetime.fromtimestamp(epoch_ms / 1000, tz=DB_TZ).replace(tzinfo=None)


def agent_email(given_name: str, surname: str) -> str:
    initial = (given_name.strip()[:1] or "").lower()
    return f"{initial}.{surname.strip().lower()}@axamansard.com"


def supervisor_match_clause(user: User) -> ColumnElement[bool]:
    """Rows whose IVR supervisor equals the user's full name.

    Deliberate simulator assumption: team membership is defined as
    supervisorgivenname + ' ' + supervisorsurname == user.full_name, until
    AXA confirms the real supervisor→agent mapping.
    """
    full = func.concat(
        SurveyRequestDetails.supervisorgivenname, " ", SurveyRequestDetails.supervisorsurname
    )
    return full == user.full_name


def kpi_delta_label(delta: float, unit: str = "%") -> str:
    arrow = "▲" if delta >= 0 else "▼"
    text = f"{abs(delta):.1f}".rstrip("0").rstrip(".")
    return f"{arrow} {text}{unit} vs previous period"
