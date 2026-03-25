from __future__ import annotations
import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import weather
from app.config import settings

log = logging.getLogger("weathernow")
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s - %(message)s")

# ---------------------------------------------------------------------------
# Optional auth/user routers — require extra packages (jose, passlib, asyncpg)
# ---------------------------------------------------------------------------
_auth_available = False
try:
    from app.routers import auth, user
    _auth_available = True
except ImportError as exc:
    log.warning("⚠️  Auth routers disabled — missing package: %s", exc)
    log.warning("    Run:  pip install python-jose[cryptography] passlib[bcrypt] asyncpg sqlalchemy[asyncio]")

app = FastAPI(
    title="WeatherNow API",
    description="Backend API for WeatherNow — powered by OpenWeatherMap",
    version="0.1.0",
)

@app.on_event("startup")
async def on_startup():
    log.info("🐍 Python %s", sys.version)
    key = settings.owm_api_key
    if key:
        log.info("✅ OWM API key loaded: %s...%s", key[:6], key[-4:])
    else:
        log.warning("⚠️  OWM API key is NOT set — check your .env file")
    if _auth_available:
        log.info("✅ Auth routers loaded  (/auth  /user)")
    else:
        log.warning("⚠️  Auth routers NOT loaded — endpoints /auth and /user are unavailable")

# ---------------------------------------------------------------------------
# CORS — allow requests from the Next.js dev server
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(weather.router, prefix="/weather", tags=["weather"])

if _auth_available:
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(user.router, prefix="/user", tags=["user"])


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "auth": _auth_available}
