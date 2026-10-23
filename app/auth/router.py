from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from sqlalchemy.orm import Session

from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_platform_db
from app.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

from app.ratelimit import limiter

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

    token = create_access_token(sub=user.email, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
    }
