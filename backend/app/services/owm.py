"""
OpenWeatherMap service layer.

Responsible for all HTTP calls to the OWM API.
Will be wired up in Sprint 1.
"""

import httpx
from app.config import settings

OWM_BASE = "https://api.openweathermap.org"
OWM_GEO_BASE = "https://api.openweathermap.org/geo/1.0"


class OWMService:
    """Async HTTP client wrapper for the OpenWeatherMap API."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def _get(self, url: str, params: dict) -> dict:
        """Perform an authenticated GET request to OWM."""
        params["appid"] = settings.owm_api_key
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------
    # TODO Sprint 1: implement the methods below
    # ------------------------------------------------------------------

    async def geocode(self, city: str, limit: int = 5) -> list[dict]:
        """Convert a city name to coordinates via OWM Geocoding API."""
        # return await self._get(f"{OWM_GEO_BASE}/direct", {"q": city, "limit": limit})
        raise NotImplementedError

    async def current_weather(self, lat: float, lon: float) -> dict:
        """Fetch current weather from OWM Current Weather Data API."""
        # return await self._get(
        #     f"{OWM_BASE}/data/2.5/weather",
        #     {"lat": lat, "lon": lon, "units": "metric"},
        # )
        raise NotImplementedError

    async def forecast(self, lat: float, lon: float) -> dict:
        """Fetch 5-day/3-hour forecast from OWM Forecast API."""
        # return await self._get(
        #     f"{OWM_BASE}/data/2.5/forecast",
        #     {"lat": lat, "lon": lon, "units": "metric"},
        # )
        raise NotImplementedError


owm_service = OWMService()
