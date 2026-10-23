"""Models for the IVR database.

These mirror the tables in the upstream IVR MariaDB. The app only ever reads
them; the seed script uses them to build the local simulator, and the same
models point at the real database in production (only IVR_DATABASE_URL changes).

NOTE: the 9th column of survey_request_latest was not visible in the source
schema screenshot — `servicestamp` is an assumption pending confirmation.
"""

from datetime import datetime

from sqlalchemy import Integer, String
from sqlalchemy.dialects.mysql import DATETIME as DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class IvrBase(DeclarativeBase):
    pass


class SurveyRequest(IvrBase):
    __tablename__ = "survey_request"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone_clid: Mapped[str] = mapped_column(String(50))
    skillset: Mapped[str] = mapped_column(String(50))
    customer_selection: Mapped[str | None] = mapped_column(String(20), nullable=True)
    inserted_time: Mapped[datetime] = mapped_column(DateTime(fsp=6))


class SurveyRequestDetails(IvrBase):
    __tablename__ = "survey_requestdetails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inserted_time: Mapped[datetime] = mapped_column(DateTime(fsp=6))
    phone_clid: Mapped[str] = mapped_column(String(50))
    skillset: Mapped[str] = mapped_column(String(100))
    customer_selection: Mapped[str | None] = mapped_column(String(10), nullable=True)
    originatedstamp: Mapped[datetime] = mapped_column(DateTime(fsp=6))
    agentgivenname: Mapped[str] = mapped_column(String(100))
    agentsurname: Mapped[str] = mapped_column(String(100))
    agentid: Mapped[str] = mapped_column(String(50))
    skillsetname: Mapped[str] = mapped_column(String(100))
    supervisorgivenname: Mapped[str] = mapped_column(String(100))
    supervisorsurname: Mapped[str] = mapped_column(String(100))
    finaldisposition: Mapped[str] = mapped_column(String(50))
    servicestamp: Mapped[datetime] = mapped_column(DateTime(fsp=6))


class SurveyResponse(IvrBase):
    __tablename__ = "survey_response"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone_clid: Mapped[str] = mapped_column(String(50))
    skillset: Mapped[str] = mapped_column(String(50))
    customer_rating: Mapped[str] = mapped_column(String(20))
    inserted_time: Mapped[datetime] = mapped_column(DateTime(fsp=6))


class SurveyRequestFiltered(IvrBase):
    __tablename__ = "survey_requestfiltered"

    sequenceid: Mapped[int] = mapped_column(Integer, primary_key=True)
    originator: Mapped[str] = mapped_column(String(50))
    originatedstamp: Mapped[datetime] = mapped_column(DateTime(fsp=6))
    finaldisposition: Mapped[str] = mapped_column(String(50))


class SurveyRequestLatest(IvrBase):
    __tablename__ = "survey_request_latest"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone_clid: Mapped[str] = mapped_column(String(50))
    skillset: Mapped[str] = mapped_column(String(50))
    customer_selection: Mapped[str | None] = mapped_column(String(20), nullable=True)
    inserted_time: Mapped[datetime] = mapped_column(DateTime(fsp=6))
    sequence: Mapped[int] = mapped_column(Integer)
    originator: Mapped[str] = mapped_column(String(50))
    originatedstamp: Mapped[datetime] = mapped_column(DateTime(fsp=6))
    finaldisposition: Mapped[str] = mapped_column(String(50))
    servicestamp: Mapped[datetime] = mapped_column(DateTime(fsp=6))  # assumed column name
