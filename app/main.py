from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

for router in (auth_router, dashboard_router, reports_router, users_router):
    app.include_router(router)
    # the production build is served by this app; the built frontend calls /api/*
    app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        candidate = dist_dir / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(dist_dir / "index.html")
