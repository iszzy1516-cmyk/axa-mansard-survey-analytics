from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_ivr_db
from app.users.models import User

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_TYPES = (
    "survey-request-details",
    "survey-requests",
    "survey-responses",
    "filtered-requests",
)


@router.get("/{report_type}")
def get_report(
    report_type: str,
    db: Session = Depends(get_ivr_db),
    user: User = Depends(get_current_user),
):
    # TODO: query the matching IVR table for the date range, with search,
    # pagination, and supervisor team scoping.
    return {"report_type": report_type, "rows": [], "total": 0}
