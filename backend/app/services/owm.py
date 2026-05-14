"""
Module : owm.py
Rôle   : Client HTTP vers l'API OpenWeatherMap avec cache mémoire TTL.

Dépendances notables :
  - httpx        : client HTTP async
  - app.config   : clé API et TTL configurables via .env
"""

from __future__ import annotations
import time
import hashlib
import json
import httpx
from app.config import settings

OWM_BASE     = "https://api.openweathermap.org"
OWM_GEO_BASE = "https://api.openweathermap.org/geo/1.0"


class OWMService:
    def __init__(self) -> None:
        # {cache_key: (data, expires_at)}
        self._cache: dict[str, tuple[object, float]] = {}

    def _cache_key(self, url: str, params: dict) -> str:
        payload = json.dumps({"url": url, "params": {k: v for k, v in params.items() if k != "appid"}}, sort_keys=True)
        return hashlib.md5(payload.encode()).hexdigest()

    def _get_cached(self, key: str) -> object | None:
        entry = self._cache.get(key)
        if entry and time.monotonic() < entry[1]:
            return entry[0]
        return None

    def _set_cached(self, key: str, data: object, ttl: int) -> None:
        now = time.monotonic()
        # Au-delà d'un seuil, purge les entrées expirées pour borner la taille du cache
        if len(self._cache) > 256:
            self._cache = {k: v for k, v in self._cache.items() if v[1] > now}
        self._cache[key] = (data, now + ttl)

    async def _get(self, url: str, params: dict, ttl: int | None = None) -> dict:
        ttl = ttl if ttl is not None else settings.cache_ttl_seconds
        key = self._cache_key(url, params)

        cached = self._get_cached(key)
        if cached is not None:
            return cached  # type: ignore[return-value]

        params["appid"] = settings.owm_api_key
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        self._set_cached(key, data, ttl)
        return data

    async def geocode(self, city: str, limit: int = 5) -> list[dict]:
        # Géocodage : TTL long, les coordonnées d'une ville ne changent pas
        return await self._get(f"{OWM_GEO_BASE}/direct", {"q": city, "limit": limit}, ttl=3600)

    async def current_weather(self, lat: float, lon: float) -> dict:
        return await self._get(f"{OWM_BASE}/data/2.5/weather", {"lat": lat, "lon": lon, "units": "metric"})

    async def forecast(self, lat: float, lon: float) -> dict:
        return await self._get(f"{OWM_BASE}/data/2.5/forecast", {"lat": lat, "lon": lon, "units": "metric"})

    async def uv_index(self, lat: float, lon: float) -> dict:
        # FIXME(gautier): /data/2.5/uvi est déprécié par OWM (déplacé dans One Call API 3.0) —
        # l'appel échoue, le routeur dégrade alors uv_index en None
        # UV change lentement : TTL plus long
        return await self._get(f"{OWM_BASE}/data/2.5/uvi", {"lat": lat, "lon": lon}, ttl=1800)

    async def air_quality(self, lat: float, lon: float) -> dict:
        return await self._get(f"{OWM_BASE}/data/2.5/air_pollution", {"lat": lat, "lon": lon})


owm_service = OWMService()
