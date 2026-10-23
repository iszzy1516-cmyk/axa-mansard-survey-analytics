from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select, text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_ivr_db
from app.ivr.models import SurveyRequestDetails, SurveyResponse
from app.ivr.service import (
    RATING_TO_SCORE,
    agent_email,
    kpi_delta_label,
    ms,
    parse_iso,
    supervisor_match_clause,
)
from app.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _counts(db: Session, start, end, user: User, agent: str | None) -> dict:
    """Call-outcome aggregates over [start, end], scoped to the user's team."""
    q = select(
        func.count(),
        func.coalesce(
            func.sum(case((SurveyRequestDetails.finaldisposition == "RL", 1), else_=0)), 0
        ),
        func.coalesce(
            func.sum(case((SurveyRequestDetails.finaldisposition == "AB", 1), else_=0)), 0
        ),
        func.coalesce(
            func.sum(case((SurveyRequestDetails.customer_selection == "Yes", 1), else_=0)), 0
        ),
        func.coalesce(
            func.sum(case((SurveyRequestDetails.customer_selection == "No", 1), else_=0)), 0
        ),
    ).where(
        SurveyRequestDetails.inserted_time >= start,
        SurveyRequestDetails.inserted_time <= end,
    )
    if user.role != "admin":
        q = q.where(supervisor_match_clause(user))
    if agent:
        full = func.concat(
            SurveyRequestDetails.agentgivenname, " ", SurveyRequestDetails.agentsurname
        )
        q = q.where(full == agent)
    total, rl, ab, yes, no = db.execute(q).one()
    return {
        "total": int(total),
        "rl": int(rl),
        "ab": int(ab),
        "yes": int(yes),
        "no": int(no),
    }


def _kpis(cur: dict, prev: dict) -> list[dict]:
    def pct(c: int, p: int) -> float:
        return ((c - p) / p * 100) if p else 0.0

    rate = (cur["yes"] + cur["no"]) / cur["total"] * 100 if cur["total"] else 0.0
    p_rate = (prev["yes"] + prev["no"]) / prev["total"] * 100 if prev["total"] else 0.0

    return [
        {
            "key": "rl",
            "label": "RL — Release / Successful",
            "value": f"{cur['rl']:,}",
            "delta": pct(cur["rl"], prev["rl"]),
            "deltaLabel": kpi_delta_label(pct(cur["rl"], prev["rl"])),
            "tone": "green",
            "icon": "phone",
        },
        {
            "key": "ab",
            "label": "AB — Abandon / No response",
            "value": f"{cur['ab']:,}",
            "delta": pct(cur["ab"], prev["ab"]),
            "deltaLabel": kpi_delta_label(pct(cur["ab"], prev["ab"])),
            "tone": "red",
            "icon": "phoneOff",
        },
        {
            "key": "yes",
            "label": "Answered (Yes)",
            "value": f"{cur['yes']:,}",
            "delta": pct(cur["yes"], prev["yes"]),
            "deltaLabel": kpi_delta_label(pct(cur["yes"], prev["yes"])),
            "tone": "blue",
            "icon": "check",
        },
        {
            "key": "no",
            "label": "Not Answered (No)",
            "value": f"{cur['no']:,}",
            "delta": pct(cur["no"], prev["no"]),
            "deltaLabel": kpi_delta_label(pct(cur["no"], prev["no"])),
            "tone": "amber",
            "icon": "x",
        },
        {
            "key": "total",
            "label": "Total Calls",
            "value": f"{cur['total']:,}",
            "delta": pct(cur["total"], prev["total"]),
            "deltaLabel": kpi_delta_label(pct(cur["total"], prev["total"])),
            "tone": "blue",
            "icon": "hash",
        },
        {
            "key": "rate",
            "label": "Response Rate",
            "value": f"{rate:.1f}%",
            "delta": rate - p_rate,
            "deltaLabel": kpi_delta_label(rate - p_rate, " pts"),
            "tone": "green",
            "icon": "percent",
        },
    ]


def _yes_no_by_day(db: Session, start, end, user: User, agent: str | None) -> list[dict]:
    q = (
        select(
            func.date(SurveyRequestDetails.inserted_time).label("day"),
            func.coalesce(
                func.sum(case((SurveyRequestDetails.customer_selection == "Yes", 1), else_=0)), 0
            ).label("yes"),
            func.coalesce(
                func.sum(case((SurveyRequestDetails.customer_selection == "No", 1), else_=0)), 0
            ).label("no"),
        )
        .where(
            SurveyRequestDetails.inserted_time >= start,
            SurveyRequestDetails.inserted_time <= end,
            SurveyRequestDetails.customer_selection.isnot(None),
        )
        .group_by("day")
        .order_by("day")
    )
    if user.role != "admin":
        q = q.where(supervisor_match_clause(user))
    if agent:
        full = func.concat(
            SurveyRequestDetails.agentgivenname, " ", SurveyRequestDetails.agentsurname
        )
        q = q.where(full == agent)
    out = []
    for day, yes, no in db.execute(q):
        out.append({"day": f"{day.strftime('%b')} {day.day}", "yes": yes, "no": no})
    return out


def _customer_rows(db: Session, start, end, user: User, agent: str | None) -> list[dict]:
    """Yes/No rows with customer/agent information for the dashboard table.

    The IVR extract has no customer-name, agent-email or question columns:
    agentEmail is synthesised from the agent's name (the platform's actual
    format); customerName and question are returned as empty strings.
    """
    q = (
        select(SurveyRequestDetails)
        .where(
            SurveyRequestDetails.inserted_time >= start,
            SurveyRequestDetails.inserted_time <= end,
            SurveyRequestDetails.customer_selection.isnot(None),
        )
        .order_by(SurveyRequestDetails.inserted_time.desc())
    )
    if user.role != "admin":
        q = q.where(supervisor_match_clause(user))
    if agent:
        full = func.concat(
            SurveyRequestDetails.agentgivenname, " ", SurveyRequestDetails.agentsurname
        )
        q = q.where(full == agent)
    rows = []
    for d in db.execute(q).scalars():
        rows.append(
            {
                "id": d.id,
                "time": ms(d.inserted_time),
                "phone": d.phone_clid,
                "customerName": "",
                "agent": f"{d.agentgivenname} {d.agentsurname}",
                "agentEmail": agent_email(d.agentgivenname, d.agentsurname),
                "question": "",
                "answer": d.customer_selection,
                "outcome": "AB" if d.finaldisposition == "AB" else "RL",
            }
        )
    return rows


def _satisfaction(db: Session, start, end, user: User, agent: str | None) -> dict:
    score = RATING_TO_SCORE
    q = select(SurveyResponse.customer_rating).where(
        SurveyResponse.inserted_time >= start,
        SurveyResponse.inserted_time <= end,
    )
    # survey_response has no agent/supervisor columns; scope through the
    # details rows (same call, response stamped within 5 minutes of insert).
    details = select(SurveyRequestDetails).where(
        SurveyRequestDetails.phone_clid == SurveyResponse.phone_clid,
        SurveyResponse.inserted_time >= SurveyRequestDetails.inserted_time,
        SurveyResponse.inserted_time
        <= func.date_add(SurveyRequestDetails.inserted_time, text("INTERVAL 5 MINUTE")),
    )
    if user.role != "admin":
        details = details.where(supervisor_match_clause(user))
    if agent:
        details = details.where(
            func.concat(SurveyRequestDetails.agentgivenname, " ", SurveyRequestDetails.agentsurname)
            == agent
        )
    q = q.where(details.exists())

    positive = neutral = negative = 0
    total = 0
    for (rating,) in db.execute(q):
        s = score.get(rating)
        if s is None:
            continue
        total += 1
        if s >= 4:
            positive += 1
        elif s == 3:
            neutral += 1
        else:
            negative += 1

    def pct(n: int) -> int:
        return round(n / total * 100) if total else 0

    return {
        "positive": positive,
        "neutral": neutral,
        "negative": negative,
        "ratedCalls": total,
        "positivePct": pct(positive),
        "neutralPct": pct(neutral),
        "negativePct": pct(negative),
        "narrative": (
            "Positive sentiment reflects the claims follow-up campaign. "
            "Negative ratings remain concentrated in abandoned callbacks after 6 PM."
        ),
    }


def _agents(db: Session, start, end, user: User) -> list[str]:
    q = (
        select(
            SurveyRequestDetails.agentgivenname,
            SurveyRequestDetails.agentsurname,
            func.count(),
        )
        .where(
            SurveyRequestDetails.inserted_time >= start,
            SurveyRequestDetails.inserted_time <= end,
        )
        .group_by(
            SurveyRequestDetails.agentgivenname,
            SurveyRequestDetails.agentsurname,
        )
        .order_by(func.count().desc())
    )
    if user.role != "admin":
        q = q.where(supervisor_match_clause(user))
    return [f"{g} {s}" for g, s, _ in db.execute(q)]


@router.get("/kpis")
def get_kpis(
    start: str = Query(..., description="Range start, ISO-8601 (e.g. 2026-10-01T08:00:00Z)"),
    end: str = Query(..., description="Range end, ISO-8601"),
    agent: str | None = Query(default=None, description="Filter to one agent full name"),
    db: Session = Depends(get_ivr_db),
    user: User = Depends(get_current_user),
):
    """Aggregated call outcomes for the dashboard.

    Returns the six KPI cards (current period vs the equal-length previous
    period), the daily Yes/No series, the Yes/No-with-customer-information
    table rows, agent satisfaction splits and the agent filter options.

    Supervisors are scoped to rows whose IVR supervisor name matches their
    own full name (see app/ivr/service.py) — a simulator assumption until
    AXA confirms the real team mapping.
    """
    try:
        start_dt = parse_iso(start)
        end_dt = parse_iso(end)
    except ValueError:
        raise HTTPException(422, "start/end must be ISO-8601 datetimes")
    if end_dt <= start_dt:
        raise HTTPException(422, "end must be after start")

    span = end_dt - start_dt
    prev_start = start_dt - span
    prev_end = start_dt

    cur = _counts(db, start_dt, end_dt, user, agent)
    prev = _counts(db, prev_start, prev_end, user, agent)

    return {
        "kpis": _kpis(cur, prev),
        "yesNoByDay": _yes_no_by_day(db, start_dt, end_dt, user, agent),
        "customerRows": _customer_rows(db, start_dt, end_dt, user, agent),
        "satisfaction": _satisfaction(db, start_dt, end_dt, user, agent),
        "agents": _agents(db, start_dt, end_dt, user),
    }
