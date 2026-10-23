from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["admin", "supervisor"]
    first_name: str
    last_name: str
    phone: str | None = None


class UserUpdate(BaseModel):
    """Partial update — fields left unset are not changed.

    ``password`` follows the same rule: omit it (or send null/empty) to keep
    the current password.
    """

    email: EmailStr | None = None
    role: Literal["admin", "supervisor"] | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    password: str | None = None


class ProfileUpdate(BaseModel):
    """Self-service profile edit (PATCH /auth/me) — role is not self-editable."""

    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ReportScheduleIn(BaseModel):
    frequency: Literal["daily", "weekly", "monthly"]
    delivery_time: str  # "HH:MM"
    format_excel: bool = True
    format_csv: bool = True
    recipients: str  # comma-separated emails


class ReportScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    frequency: str
    delivery_time: str
    format_excel: bool
    format_csv: bool
    recipients: str
    updated_at: datetime


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    first_name: str
    last_name: str
    phone: str | None
    is_active: bool
    created_at: datetime
