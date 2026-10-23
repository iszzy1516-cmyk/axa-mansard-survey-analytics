"""Build and seed the simulated IVR database for local development.

Creates the IVR database (from IVR_DATABASE_URL), creates the five tables,
and fills them with ~3 weeks of Health-skillset survey data so the dashboard
and reports have realistic shape. Rerunning wipes and rebuilds the IVR data.

Usage:
    python scripts/seed_demo_data.py
    python scripts/seed_demo_data.py --days 21 --calls-per-day 600
"""

import argparse
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, text

from app.config import settings
from app.database import ivr_engine
from app.ivr.models import (
    IvrBase,
    SurveyRequest,
    SurveyRequestDetails,
    SurveyRequestFiltered,
    SurveyRequestLatest,
    SurveyResponse,
)

SKILLSET = "Health"

AGENTS = [
    ("Shakirat", "Onatoye", "5049"),
    ("Victoria", "Ayoola", "5058"),
    ("Nosa", "Odigie", "5054"),
    ("Oluwapelumi", "Olubode", "5013"),
    ("Ekeminiabasi", "Udoette", "5102"),
    ("Funmilola", "Ogundeji", "5070"),
    ("Motunrayo", "Oyewo", "5034"),
    ("Mojeed", "Adeleye", "5046"),
]
SUPERVISOR = ("Opemipo", "Oyedele-Owolabi")

FIRST_NAMES = [
    "Adaeze", "Chidi", "Funke", "Ibrahim", "Ngozi", "Tunde", "Kemi", "Emeka",
    "Aisha", "Bala", "Chiamaka", "Yusuf", "Amara", "Segun", "Halima", "Obi",
]
LAST_NAMES = [
    "Obi", "Nwosu", "Adeyemi", "Musa", "Eze", "Bakare", "Adebayo", "Okafor",
    "Bello", "Danladi", "Okonkwo", "Adeleke", "Ogunleye", "Nwachukwu", "Sani",
]

RATINGS = ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]
RATING_WEIGHTS = [0.40, 0.22, 0.16, 0.12, 0.10]  # ~62% positive, like the mockups

PHONE_PREFIXES = ["0701", "0703", "0705", "0802", "0803", "0805", "0807", "0810", "0813", "0816", "0902", "0905"]


def random_phone(rng: random.Random) -> str:
    return rng.choice(PHONE_PREFIXES) + "".join(rng.choice("0123456789") for _ in range(7))


def random_stamp(rng: random.Random, day: datetime) -> datetime:
    # Business hours 08:00–18:00 WAT with a midday peak, microsecond precision
    seconds = int(rng.betavariate(2, 3) * 10 * 60 * 60)
    return day.replace(hour=8) + timedelta(seconds=seconds, microseconds=rng.randrange(1_000_000))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=21)
    parser.add_argument("--calls-per-day", type=int, default=600)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = random.Random(args.seed)

    # Create the database itself if it doesn't exist (engine URL includes the db name)
    server_url = ivr_engine.url.set(database="")
    server_engine = create_engine(server_url)
    with server_engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{ivr_engine.url.database}`"))
        conn.commit()
    server_engine.dispose()

    IvrBase.metadata.drop_all(ivr_engine)
    IvrBase.metadata.create_all(ivr_engine)
    print(f"IVR tables created in {ivr_engine.url.database!r}.")

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    sequence = 700_000

    request_rows, detail_rows, response_rows = [], [], []
    filtered_rows, latest_rows = [], []

    for day_offset in range(args.days, 0, -1):
        day = today - timedelta(days=day_offset)
        for _ in range(args.calls_per_day):
            phone = random_phone(rng)
            customer = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
            inserted = random_stamp(rng, day)
            originated = inserted - timedelta(seconds=rng.randint(60, 900))

            disposition = rng.choices(["RL", "AB"], weights=[0.83, 0.17])[0]
            if disposition == "RL":
                selection = rng.choices(["Yes", "No"], weights=[0.46, 0.54])[0]
            else:
                selection = None

            request_rows.append({
                "phone_clid": phone,
                "skillset": SKILLSET,
                "customer_selection": selection,
                "inserted_time": inserted,
            })

            agent = rng.choice(AGENTS)
            detail_rows.append({
                "inserted_time": inserted,
                "phone_clid": phone,
                "skillset": SKILLSET,
                "customer_selection": selection,
                "originatedstamp": originated,
                "agentgivenname": agent[0],
                "agentsurname": agent[1],
                "agentid": agent[2],
                "skillsetname": SKILLSET,
                "supervisorgivenname": SUPERVISOR[0],
                "supervisorsurname": SUPERVISOR[1],
                "finaldisposition": disposition,
                "servicestamp": originated + timedelta(seconds=rng.randint(120, 1500)),
            })

            # ~45% of released calls get a rating
            if disposition == "RL" and rng.random() < 0.45:
                response_rows.append({
                    "phone_clid": phone,
                    "skillset": SKILLSET,
                    "customer_rating": rng.choices(RATINGS, weights=RATING_WEIGHTS)[0],
                    "inserted_time": inserted + timedelta(seconds=rng.randint(1, 300)),
                })

            # ~30% of calls land in the filtered / latest views
            if rng.random() < 0.30:
                sequence += 1
                filtered_rows.append({
                    "sequenceid": sequence,
                    "originator": phone,
                    "originatedstamp": originated,
                    "finaldisposition": disposition,
                })
                latest_rows.append({
                    "phone_clid": phone,
                    "skillset": SKILLSET,
                    "customer_selection": selection,
                    "inserted_time": inserted,
                    "sequence": sequence,
                    "originator": phone,
                    "originatedstamp": originated,
                    "finaldisposition": disposition,
                    "servicestamp": originated + timedelta(seconds=rng.randint(120, 1500)),
                })

    with ivr_engine.begin() as conn:
        conn.execute(SurveyRequest.__table__.insert(), request_rows)
        conn.execute(SurveyRequestDetails.__table__.insert(), detail_rows)
        conn.execute(SurveyResponse.__table__.insert(), response_rows)
        conn.execute(SurveyRequestFiltered.__table__.insert(), filtered_rows)
        conn.execute(SurveyRequestLatest.__table__.insert(), latest_rows)

    print(f"Seeded {len(request_rows)} survey_request, {len(detail_rows)} survey_requestdetails, "
          f"{len(response_rows)} survey_response, {len(filtered_rows)} survey_requestfiltered, "
          f"{len(latest_rows)} survey_request_latest rows over the last {args.days} days.")


if __name__ == "__main__":
    main()
