"""
Module : weather.py
Rôle   : Endpoints météo — géocodage, météo courante et prévisions sur 7 jours / 24h.

Dépendances notables :
  - owm_service : client HTTP vers l'API OpenWeatherMap (mise en cache incluse)
"""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.models.weather import (
    CurrentWeather, Forecast, ForecastItem, GeoLocation, HourlyItem, WeatherCondition,
)
from app.services.owm import owm_service
from app.config import settings

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("weathernow")

router = APIRouter()


@router.get("/geocode", response_model=list[GeoLocation])
async def geocode(
    city: str = Query(...),
    limit: int = Query(5, ge=1, le=10),
):
    """
    Convertit un nom de ville en liste de coordonnées GPS via OWM Geocoding API.

    Args:
        city (str): Nom de la ville à rechercher.
        limit (int): Nombre maximum de résultats retournés (1-10).

    Returns:
        list[GeoLocation]: Résultats de géocodage avec nom, pays, état et coordonnées.

    Raises:
        HTTPException: 502 si l'API OWM est injoignable ou renvoie une erreur.
    """
    key_preview = settings.owm_api_key[:6] + "..." if settings.owm_api_key else "NOT SET"
    log.debug(f"[geocode] city={city!r}  api_key={key_preview}")
    try:
        results = await owm_service.geocode(city, limit)
        log.debug(f"[geocode] ✅ {len(results)} result(s) for {city!r}: {[r.get('name') for r in results]}")
    except Exception as e:
        log.error(f"[geocode] ❌ OWM error: {e}")
        raise HTTPException(status_code=502, detail=str(e))
    return [
        GeoLocation(
            name=r["name"],
            lat=r["lat"],
            lon=r["lon"],
            country=r["country"],
            state=r.get("state"),
        )
        for r in results
    ]


@router.get("/current", response_model=CurrentWeather)
async def current_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """
    Retourne la météo courante pour des coordonnées GPS données.

    Args:
        lat (float): Latitude entre -90 et 90.
        lon (float): Longitude entre -180 et 180.

    Returns:
        CurrentWeather: Température, conditions, vent, humidité, pression, etc.

    Raises:
        HTTPException: 502 si l'API OWM est injoignable ou renvoie une erreur.
    """
    log.debug(f"[current] lat={lat}  lon={lon}")
    try:
        raw, uv_raw, aq_raw = await asyncio.gather(
            owm_service.current_weather(lat, lon),
            owm_service.uv_index(lat, lon),
            owm_service.air_quality(lat, lon),
            return_exceptions=True,
        )
        if isinstance(raw, Exception):
            raise raw
        log.debug(f"[current] ✅ {raw.get('name')}, {raw.get('sys', {}).get('country')}  temp={raw.get('main', {}).get('temp')}°C")
    except Exception as e:
        log.error(f"[current] ❌ OWM error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    uv_index = uv_raw.get("value") if isinstance(uv_raw, dict) else None
    aqi = aq_raw["list"][0]["main"]["aqi"] if isinstance(aq_raw, dict) and aq_raw.get("list") else None

    return CurrentWeather(
        city=raw["name"],
        country=raw["sys"]["country"],
        lat=raw["coord"]["lat"],
        lon=raw["coord"]["lon"],
        temp=raw["main"]["temp"],
        feels_like=raw["main"]["feels_like"],
        temp_min=raw["main"]["temp_min"],
        temp_max=raw["main"]["temp_max"],
        humidity=raw["main"]["humidity"],
        pressure=raw["main"]["pressure"],
        wind_speed=raw["wind"]["speed"],
        wind_deg=raw["wind"].get("deg", 0),
        visibility=raw.get("visibility", 10000),
        weather=[WeatherCondition(**w) for w in raw["weather"]],
        dt=raw["dt"],
        sunrise=raw["sys"]["sunrise"],
        sunset=raw["sys"]["sunset"],
        uv_index=uv_index,
        aqi=aqi,
    )


@router.get("/forecast", response_model=Forecast)
async def forecast(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """
    Retourne les prévisions sur 7 jours (aggrégation par jour) et 24h (créneaux 3h).

    Args:
        lat (float): Latitude entre -90 et 90.
        lon (float): Longitude entre -180 et 180.

    Returns:
        Forecast: Prévisions journalières et horaires.

    Raises:
        HTTPException: 502 si l'API OWM est injoignable ou renvoie une erreur.
    """
    log.debug(f"[forecast] lat={lat}  lon={lon}")
    try:
        raw = await owm_service.forecast(lat, lon)
        log.debug(f"[forecast] ✅ {raw.get('city', {}).get('name')}  {len(raw.get('list', []))} raw slots received")
    except Exception as e:
        log.error(f"[forecast] ❌ OWM error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    items_raw = raw["list"]

    # Horaire : les 8 premiers créneaux couvrent les 24h suivantes (intervalles de 3h)
    hourly = [
        HourlyItem(
            dt=item["dt"],
            temp=item["main"]["temp"],
            weather=[WeatherCondition(**w) for w in item["weather"]],
            rain=item.get("rain", {}).get("3h") or None,
            pop=item.get("pop", 0),
        )
        for item in items_raw[:8]
    ]

    # Journalier : agrégation par date UTC
    day_groups: dict = defaultdict(list)
    for item in items_raw:
        day = datetime.fromtimestamp(item["dt"], tz=timezone.utc).date()
        day_groups[day].append(item)

    daily: list[ForecastItem] = []
    for day in sorted(day_groups.keys()):
        group = day_groups[day]
        # Créneau le plus proche de midi = représentatif de la météo de la journée
        noon = min(
            group,
            key=lambda x: abs(datetime.fromtimestamp(x["dt"], tz=timezone.utc).hour - 12),
        )
        temps = [i["main"]["temp"] for i in group]
        total_rain = sum(i.get("rain", {}).get("3h", 0) for i in group)
        daily.append(
            ForecastItem(
                dt=noon["dt"],
                temp=round(sum(temps) / len(temps), 1),
                temp_min=round(min(i["main"]["temp_min"] for i in group), 1),
                temp_max=round(max(i["main"]["temp_max"] for i in group), 1),
                humidity=round(sum(i["main"]["humidity"] for i in group) / len(group)),
                weather=[WeatherCondition(**w) for w in noon["weather"]],
                wind_speed=noon["wind"]["speed"],
                pop=max(i.get("pop", 0) for i in group),
                rain=round(total_rain, 1) if total_rain > 0 else None,
            )
        )

    return Forecast(
        city=raw["city"]["name"],
        country=raw["city"]["country"],
        items=daily,
        hourly=hourly,
    )
