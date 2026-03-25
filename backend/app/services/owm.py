from __future__ import annotations
import httpx
from app.config import settings

OWM_BASE = "https://api.openweathermap.org"
OWM_GEO_BASE = "https://api.openweathermap.org/geo/1.0"


class OWMService:
    async def _get(self, url: str, params: dict) -> dict:
        params["appid"] = settings.owm_api_key
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    async def geocode(self, city: str, limit: int = 5) -> list[dict]:
        return await self._get(f"{OWM_GEO_BASE}/direct", {"q": city, "limit": limit})

    async def current_weather(self, lat: float, lon: float) -> dict:
        return await self._get(
            f"{OWM_BASE}/data/2.5/weather",
            {"lat": lat, "lon": lon, "units": "metric"},
        )

    async def forecast(self, lat: float, lon: float) -> dict:
        return await self._get(
            f"{OWM_BASE}/data/2.5/forecast",
            {"lat": lat, "lon": lon, "units": "metric"},
        )


owm_service = OWMService()
