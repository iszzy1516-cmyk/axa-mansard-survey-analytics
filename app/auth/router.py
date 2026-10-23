from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_platform_db
from app.ratelimit import limiter
from app.users.models import ReportSchedule, User
from app.users.schemas import (
    ChangePasswordRequest,
    ProfileUpdate,
    ReportScheduleIn,
    ReportScheduleOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Dummy hash so unknown-email and wrong-password responses take the same time,
# keeping the endpoint from revealing which emails exist.
_DUMMY_HASH = hash_password("dummy-password-for-timing")


@router.post("/login")
@limiter.limit(settings.login_rate_limit)
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_platform_db),
):
    user = db.query(User).filter(User.email == form.username).first()
    password_hash = user.password_hash if user else _DUMMY_HASH
    if not verify_password(form.password, password_hash) or user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    # sub = immutable user id (so later email changes don't invalidate the
    # session); tv = token_version for "sign out of all devices".
    token = create_access_token(
        sub=str(user.id), role=user.role, token_version=user.token_version
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
    }


@router.patch("/me")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_platform_db),
    user: User = Depends(get_current_user),
):
    """Edit the caller's own profile (any role). Role is not self-editable.

    Email must stay unique (409 on conflict with another account). Tokens
    carry the user id, so an email change does not require re-login.
    """
    data = payload.model_dump(exclude_unset=True)
    new_email = data.get("email")
    if new_email is not None and new_email != user.email:
        clash = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    return {"email": user.email, "role": user.role, "full_name": user.full_name}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_platform_db),
    user: User = Depends(get_current_user),
):
    """Change the caller's password; invalidates every session (incl. this one)."""
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    db.commit()
    return {"status": "ok"}


@router.post("/sign-out-all")
def sign_out_all(
    db: Session = Depends(get_platform_db),
    user: User = Depends(get_current_user),
):
    """Invalidate every outstanding token for the caller."""
    user.token_version += 1
    db.commit()
    return {"status": "ok"}


@router.get("/me/schedule", response_model=ReportScheduleOut)
def get_schedule(
    db: Session = Depends(get_platform_db),
    user: User = Depends(get_current_user),
):
    """The caller's saved report-delivery schedule (404 if never saved)."""
    schedule = user.schedule
    if schedule is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No schedule saved")
    return schedule


@router.put("/me/schedule", response_model=ReportScheduleOut)
def put_schedule(
    payload: ReportScheduleIn,
    db: Session = Depends(get_platform_db),
    user: User = Depends(get_current_user),
):
    """Create or replace the caller's report-delivery schedule (upsert).

    Persistence only — no email is sent (SMTP comes later).
    """
    schedule = user.schedule
    if schedule is None:
        schedule = ReportSchedule(user_id=user.id)
        db.add(schedule)
    schedule.frequency = payload.frequency
    schedule.delivery_time = payload.delivery_time
    schedule.format_excel = payload.format_excel
    schedule.format_csv = payload.format_csv
    schedule.recipients = payload.recipients
    db.commit()
    db.refresh(schedule)
    return schedule
