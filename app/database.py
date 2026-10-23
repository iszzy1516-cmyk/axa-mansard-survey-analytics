from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

ivr_engine = create_engine(settings.ivr_database_url, pool_pre_ping=True)
platform_engine = create_engine(settings.platform_database_url, pool_pre_ping=True)

IvrSession = sessionmaker(bind=ivr_engine)
PlatformSession = sessionmaker(bind=platform_engine)


def get_ivr_db():
    db = IvrSession()
    try:
        yield db
    finally:
        db.close()


def get_platform_db():
    db = PlatformSession()
    try:
        yield db
    finally:
        db.close()
