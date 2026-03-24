from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import weather

app = FastAPI(
    title="WeatherNow API",
    description="Backend API for WeatherNow — powered by OpenWeatherMap",
    version="0.1.0",
)

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
