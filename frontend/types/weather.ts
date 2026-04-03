export interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  visibility: number;
  weather: WeatherCondition[];
  dt: number;
  sunrise: number;
  sunset: number;
  uv_index?: number;
  aqi?: number;
}

export interface HourlyItem {
  dt: number;
  temp: number;
  weather: WeatherCondition[];
  rain?: number;
  pop: number;
}

export interface ForecastItem {
  dt: number;
  temp: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  weather: WeatherCondition[];
  wind_speed: number;
  pop: number;
  rain?: number;
}

export interface Forecast {
  city: string;
  country: string;
  items: ForecastItem[];
  hourly: HourlyItem[];
}
