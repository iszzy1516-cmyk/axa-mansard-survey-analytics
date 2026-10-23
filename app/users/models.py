from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(Enum("admin", "supervisor", name="user_role"))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    # Incremented to invalidate every outstanding JWT ("sign out of all
    # devices"). Verified against the token's tv claim on each request.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    schedule: Mapped["ReportSchedule | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class ReportSchedule(Base):
    """Per-user scheduled report delivery preferences.

    One row per user (upserted via PUT /auth/me/schedule). Sending is not
    implemented yet — there is no SMTP server; this only persists intent.
    """

    __tablename__ = "report_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    frequency: Mapped[str] = mapped_column(Enum("daily", "weekly", "monthly", name="schedule_frequency"))
    delivery_time: Mapped[str] = mapped_column(String(5))  # "HH:MM"
    format_excel: Mapped[bool] = mapped_column(Boolean, default=True)
    format_csv: Mapped[bool] = mapped_column(Boolean, default=True)
    recipients: Mapped[str] = mapped_column(Text)  # comma-separated emails
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="schedule")
