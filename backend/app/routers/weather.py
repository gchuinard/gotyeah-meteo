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
    log.debug(f"[current] lat={lat}  lon={lon}")
    try:
        raw = await owm_service.current_weather(lat, lon)
        log.debug(f"[current] ✅ {raw.get('name')}, {raw.get('sys', {}).get('country')}  temp={raw.get('main', {}).get('temp')}°C  condition={raw.get('weather', [{}])[0].get('description')}")
    except Exception as e:
        log.error(f"[current] ❌ OWM error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

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
    )


@router.get("/forecast", response_model=Forecast)
async def forecast(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    log.debug(f"[forecast] lat={lat}  lon={lon}")
    try:
        raw = await owm_service.forecast(lat, lon)
        log.debug(f"[forecast] ✅ {raw.get('city', {}).get('name')}  {len(raw.get('list', []))} raw slots received")
    except Exception as e:
        log.error(f"[forecast] ❌ OWM error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    items_raw = raw["list"]

    # Hourly: first 8 slots (3h intervals = 24h)
    hourly = [
        HourlyItem(
            dt=item["dt"],
            temp=item["main"]["temp"],
            weather=[WeatherCondition(**w) for w in item["weather"]],
        )
        for item in items_raw[:8]
    ]

    # Daily: aggregate by UTC date
    day_groups: dict = defaultdict(list)
    for item in items_raw:
        day = datetime.fromtimestamp(item["dt"], tz=timezone.utc).date()
        day_groups[day].append(item)

    daily: list[ForecastItem] = []
    for day in sorted(day_groups.keys()):
        group = day_groups[day]
        # Pick the item closest to noon for the representative condition
        noon = min(
            group,
            key=lambda x: abs(datetime.fromtimestamp(x["dt"], tz=timezone.utc).hour - 12),
        )
        temps = [i["main"]["temp"] for i in group]
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
            )
        )

    return Forecast(
        city=raw["city"]["name"],
        country=raw["city"]["country"],
        items=daily,
        hourly=hourly,
    )
