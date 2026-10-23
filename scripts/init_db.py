"""Set up the platform database once a MariaDB connection URL is available.

Creates the platform tables (users, and future platform tables) and,
optionally, the first admin account — you need one to log in and manage
users from the app.

Usage:
    python scripts/init_db.py                                    # tables only
    python scripts/init_db.py --admin-email a@b.com --admin-password '...' \
        --first-name David --last-name Okafor
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings
from app.database import platform_engine
from app.users.models import Base, User
from app.auth.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--admin-email")
    parser.add_argument("--admin-password")
    parser.add_argument("--first-name", default="Admin")
    parser.add_argument("--last-name", default="User")
    args = parser.parse_args()

    print(f"Connecting to platform DB: {settings.platform_database_url.split('@')[-1]}")
    Base.metadata.create_all(platform_engine)
    print("Tables created (if they did not exist).")

    if args.admin_email and args.admin_password:
        from sqlalchemy.orm import Session

        with Session(platform_engine) as db:
            if db.query(User).filter(User.email == args.admin_email).first():
                print(f"Admin {args.admin_email} already exists — skipping.")
                return
            db.add(
                User(
                    email=args.admin_email,
                    password_hash=hash_password(args.admin_password),
                    role="admin",
                    first_name=args.first_name,
                    last_name=args.last_name,
                )
            )
            db.commit()
        print(f"Admin {args.admin_email} created.")


if __name__ == "__main__":
    main()
