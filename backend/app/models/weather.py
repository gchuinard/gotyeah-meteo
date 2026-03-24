"""
Pydantic models for weather data.

These will be used as response models once the OWM service is wired up in Sprint 1.
"""

from pydantic import BaseModel


class GeoLocation(BaseModel):
    name: str
    lat: float
    lon: float
    country: str
    state: str | None = None


class WeatherCondition(BaseModel):
    id: int
    main: str
    description: str
    icon: str


class CurrentWeather(BaseModel):
    city: str
    country: str
    lat: float
    lon: float
    temp: float
    feels_like: float
    temp_min: float
    temp_max: float
    humidity: int
    wind_speed: float
    wind_deg: int
    visibility: int
    weather: list[WeatherCondition]
    dt: int
    sunrise: int
    sunset: int


class ForecastItem(BaseModel):
    dt: int
    temp: float
    temp_min: float
    temp_max: float
    humidity: int
    weather: list[WeatherCondition]
    wind_speed: float
    pop: float  # probability of precipitation (0–1)


class Forecast(BaseModel):
    city: str
    country: str
    items: list[ForecastItem]
