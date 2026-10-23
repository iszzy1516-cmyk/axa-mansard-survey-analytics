from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_ivr_db
from app.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_ivr_db),
    user: User = Depends(get_current_user),
):
    # TODO: aggregate call outcomes over the selected date/agent range from the
    # IVR tables. Supervisors are scoped to their own team's rows.
    return {}
