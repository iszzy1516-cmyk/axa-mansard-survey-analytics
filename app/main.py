from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth.router import router as auth_router
from app.ratelimit import limiter
from app.dashboard.router import router as dashboard_router
from app.reports.router import router as reports_router
from app.users.router import router as users_router

app = FastAPI(title="AXA Mansard Survey Call Analytics")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(users_router)


@app.get("/health")
def health():
    return {"status": "ok"}
