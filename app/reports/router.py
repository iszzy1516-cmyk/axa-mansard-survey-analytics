from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import ColumnElement, String, and_, cast, func, or_, select, text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_ivr_db
from app.ivr.models import (
    SurveyRequest,
    SurveyRequestDetails,
    SurveyRequestFiltered,
    SurveyResponse,
)
from app.ivr.service import (
    RATING_TO_SCORE,
    agent_email,
    ms,
    parse_iso,
    supervisor_match_clause,
)
from app.users.models import User

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_TYPES = (
    "survey-request-details",
    "survey-requests",
    "survey-responses",
    "filtered-requests",
)

_MAX_PAGE_SIZE = 50_000


def _details_scope_exists(
    user: User,
    phone_col,
    time_col=None,
    time_slack_minutes: int | None = None,
    time_matches_inserted: bool = False,
):
    """EXISTS clause binding a report row to a details row the user may see.

    Tables without supervisor columns (survey_request, survey_response,
    survey_requestfiltered) are scoped through survey_requestdetails:
    same phone, plus a timestamp condition — exact match against the details
    ``inserted_time`` (survey_request), exact match against the details
    ``originatedstamp`` (survey_requestfiltered), or within
    ``time_slack_minutes`` of the insert for tables whose stamp is offset
    (survey_response).
    """
    conditions = [SurveyRequestDetails.phone_clid == phone_col]
    if time_col is not None:
        details_time = (
            SurveyRequestDetails.inserted_time
            if time_matches_inserted
            else SurveyRequestDetails.originatedstamp
        )
        if time_slack_minutes:
            conditions.append(time_col >= SurveyRequestDetails.inserted_time)
            conditions.append(
                time_col
                <= func.date_add(
                    SurveyRequestDetails.inserted_time,
                    text(f"INTERVAL {int(time_slack_minutes)} MINUTE"),
                )
            )
        else:
            conditions.append(time_col == details_time)
    details = select(SurveyRequestDetails.id).where(*conditions)
    if user.role != "admin":
        details = details.where(supervisor_match_clause(user))
    return details.exists()


def _search_clause(search: str, *columns) -> ColumnElement[bool] | None:
    """All whitespace-separated terms must match (any column)."""
    clauses = [
        or_(*[cast(c, String).ilike(f"%{t}%") for c in columns])
        for t in search.split()
        if t
    ]
    if not clauses:
        return None
    return clauses[0] if len(clauses) == 1 else and_(*clauses)


def _query_details(db: Session, user: User, start, end, search: str):
    q = (
        select(SurveyRequestDetails)
        .where(
            SurveyRequestDetails.inserted_time >= start,
            SurveyRequestDetails.inserted_time <= end,
        )
        .order_by(SurveyRequestDetails.inserted_time.desc())
    )
    if user.role != "admin":
        q = q.where(supervisor_match_clause(user))
    if search:
        q = q.where(
            _search_clause(
                search,
                SurveyRequestDetails.phone_clid,
                SurveyRequestDetails.skillset,
                SurveyRequestDetails.customer_selection,
                SurveyRequestDetails.agentgivenname,
                SurveyRequestDetails.agentsurname,
                SurveyRequestDetails.supervisorgivenname,
                SurveyRequestDetails.supervisorsurname,
                SurveyRequestDetails.finaldisposition,
            )
        )
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    return q, total, lambda d: {
        "insertedTime": ms(d.inserted_time),
        "phoneClid": d.phone_clid,
        "skillset": d.skillset,
        "selection": d.customer_selection,
        "agent": f"{d.agentgivenname} {d.agentsurname}",
        "agentEmail": agent_email(d.agentgivenname, d.agentsurname),
        "supervisor": f"{d.supervisorgivenname} {d.supervisorsurname}",
        "disposition": d.finaldisposition if d.finaldisposition in ("RL", "AB") else "OTHER",
    }


def _query_requests(db: Session, user: User, start, end, search: str):
    q = (
        select(SurveyRequest)
        .where(
            SurveyRequest.inserted_time >= start,
            SurveyRequest.inserted_time <= end,
        )
        .order_by(SurveyRequest.inserted_time.desc())
    )
    q = q.where(
        _details_scope_exists(
            user, SurveyRequest.phone_clid, SurveyRequest.inserted_time, time_matches_inserted=True
        )
    )
    if search:
        q = q.where(
            _search_clause(
                search,
                SurveyRequest.id,
                SurveyRequest.phone_clid,
                SurveyRequest.skillset,
                SurveyRequest.customer_selection,
            )
        )
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    return q, total, lambda r: {
        "id": r.id,
        "phoneClid": r.phone_clid,
        "skillset": r.skillset,
        "customerSelection": r.customer_selection,
        "insertedTime": ms(r.inserted_time),
    }


def _query_responses(db: Session, user: User, start, end, search: str):
    q = (
        select(SurveyResponse)
        .where(
            SurveyResponse.inserted_time >= start,
            SurveyResponse.inserted_time <= end,
        )
        .order_by(SurveyResponse.inserted_time.desc())
    )
    # response rows are stamped seconds-to-minutes after the request insert
    q = q.where(
        _details_scope_exists(
            user, SurveyResponse.phone_clid, SurveyResponse.inserted_time, time_slack_minutes=5
        )
    )
    if search:
        q = q.where(
            _search_clause(
                search,
                SurveyResponse.id,
                SurveyResponse.phone_clid,
                SurveyResponse.skillset,
                SurveyResponse.customer_rating,
            )
        )
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    return q, total, lambda r: {
        "id": r.id,
        "phoneClid": r.phone_clid,
        "skillset": r.skillset,
        "customerRating": RATING_TO_SCORE.get(r.customer_rating, 0),
        "insertedTime": ms(r.inserted_time),
    }


def _query_filtered(db: Session, user: User, start, end, search: str):
    q = (
        select(SurveyRequestFiltered)
        .where(
            SurveyRequestFiltered.originatedstamp >= start,
            SurveyRequestFiltered.originatedstamp <= end,
        )
        .order_by(SurveyRequestFiltered.originatedstamp.desc())
    )
    q = q.where(
        _details_scope_exists(user, SurveyRequestFiltered.originator, SurveyRequestFiltered.originatedstamp)
    )
    if search:
        q = q.where(
            _search_clause(
                search,
                SurveyRequestFiltered.sequenceid,
                SurveyRequestFiltered.originator,
                SurveyRequestFiltered.finaldisposition,
            )
        )
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    return q, total, lambda f: {
        "sequenceId": f.sequenceid,
        "originator": f.originator,
        "originatedStamp": ms(f.originatedstamp),
        "finalDisposition": f.finaldisposition if f.finaldisposition in ("RL", "AB") else "AB",
    }


_QUERIES = {
    "survey-request-details": _query_details,
    "survey-requests": _query_requests,
    "survey-responses": _query_responses,
    "filtered-requests": _query_filtered,
}


@router.get("/{report_type}")
def get_report(
    report_type: str,
    start: str = Query(..., description="Range start, ISO-8601"),
    end: str = Query(..., description="Range end, ISO-8601"),
    search: str = Query(default="", description="Case-insensitive match across the row's columns"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=0, le=_MAX_PAGE_SIZE),
    db: Session = Depends(get_ivr_db),
    user: User = Depends(get_current_user),
):
    """Paginated report rows from the IVR tables.

    Response envelope matches the frontend ReportResult type: ``rows`` for
    the requested page, ``total`` matching rows in the range (after search),
    plus the echoed range. ``per_page=0`` returns every matching row for
    client-side export.

    Supervisors only see rows whose IVR supervisor name matches their own
    full name (see app/ivr/service.py); admins see everything.
    """
    if report_type not in _QUERIES:
        raise HTTPException(404, f"Unknown report type: {report_type}")
    try:
        start_dt = parse_iso(start)
        end_dt = parse_iso(end)
    except ValueError:
        raise HTTPException(422, "start/end must be ISO-8601 datetimes")
    if end_dt <= start_dt:
        raise HTTPException(422, "end must be after start")

    q, total, serialize = _QUERIES[report_type](db, user, start_dt, end_dt, search)

    if per_page == 0:
        rows = [serialize(r) for r in db.execute(q).scalars()]
    else:
        rows = [
            serialize(r)
            for r in db.execute(q.offset((page - 1) * per_page).limit(per_page)).scalars()
        ]

    return {
        "reportType": report_type,
        "rows": rows,
        "total": total,
        "rangeStart": ms(start_dt),
        "rangeEnd": ms(end_dt),
    }
