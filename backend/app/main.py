from __future__ import annotations
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import weather
from app.config import settings

log = logging.getLogger("weathernow")

app = FastAPI(
    title="WeatherNow API",
    description="Backend API for WeatherNow — powered by OpenWeatherMap",
    version="0.1.0",
)

@app.on_event("startup")
async def on_startup():
    key = settings.owm_api_key
    if key:
        log.info(f"✅ OWM API key loaded: {key[:6]}...{key[-4:]}")
    else:
        log.warning("⚠️  OWM API key is NOT set — check your .env file")

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


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
