from typing import Optional, List
from pydantic import BaseModel


class GeoLocation(BaseModel):
    name: str
    lat: float
    lon: float
    country: str
    state: Optional[str] = None


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
    pressure: int
    wind_speed: float
    wind_deg: int
    visibility: int
    weather: List[WeatherCondition]
    dt: int
    sunrise: int
    sunset: int
    uv_index: Optional[float] = None
    aqi: Optional[int] = None


class HourlyItem(BaseModel):
    dt: int
    temp: float
    weather: List[WeatherCondition]


class ForecastItem(BaseModel):
    dt: int
    temp: float
    temp_min: float
    temp_max: float
    humidity: int
    weather: List[WeatherCondition]
    wind_speed: float
    pop: float


class Forecast(BaseModel):
    city: str
    country: str
    items: List[ForecastItem]
    hourly: List[HourlyItem]
