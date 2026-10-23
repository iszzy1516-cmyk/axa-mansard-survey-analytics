from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.security import hash_password
from app.database import get_platform_db
from app.users.models import User
from app.users.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_platform_db),
    _: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_platform_db),
    _: User = Depends(require_admin),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_platform_db),
    admin: User = Depends(require_admin),
):
    """Partially update a user (admin only).

    Unset fields are left unchanged; ``password`` is re-hashed with Argon2id
    when provided. Email changes must be unique (409 on conflict). An admin
    cannot demote themselves — the same self-protection as delete.
    """
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    data = payload.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    if password is not None:
        if not password:
            password = None  # empty string means "keep current password"
        else:
            user.password_hash = hash_password(password)

    if user.id == admin.id and data.get("role") is not None and data["role"] != "admin":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "You cannot demote your own account"
        )

    new_email = data.get("email")
    if new_email is not None:
        clash = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already exists")

    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_platform_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete yourself")
    db.delete(user)
    db.commit()
