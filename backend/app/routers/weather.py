"""
Weather router — three endpoints that will delegate to the OWM service.

Cache strategy (placeholder):
  - TTL: 10 minutes per (endpoint + params) key
  - To be implemented with a simple in-memory dict or Redis in Sprint 1
"""

from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/geocode")
async def geocode(
    city: str = Query(..., description="City name to geocode"),
    limit: int = Query(5, ge=1, le=10, description="Max number of results"),
):
    """
    Convert a city name to geographic coordinates (lat/lon).

    Returns a list of matching locations ordered by relevance.
    """
    # TODO Sprint 1: call OWM Geocoding API
    # Cache key: f"geocode:{city.lower()}:{limit}"  TTL: 10 min
    return []


@router.get("/current")
async def current_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
):
    """
    Return current weather conditions for the given coordinates.

    Data includes temperature, humidity, wind speed, and weather condition.
    """
    # TODO Sprint 1: call OWM Current Weather API
    # Cache key: f"current:{lat:.4f}:{lon:.4f}"  TTL: 10 min
    return {}


@router.get("/forecast")
async def forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    days: int = Query(5, ge=1, le=7, description="Number of forecast days"),
):
    """
    Return a multi-day weather forecast for the given coordinates.

    Returns daily aggregates (min/max temp, precipitation probability, etc.).
    """
    # TODO Sprint 1: call OWM 5-day/3-hour Forecast API and aggregate by day
    # Cache key: f"forecast:{lat:.4f}:{lon:.4f}:{days}"  TTL: 10 min
    return {"items": []}
