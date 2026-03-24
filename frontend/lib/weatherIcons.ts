/**
 * Maps OpenWeatherMap icon codes to Material Symbols Outlined icon names.
 * OWM icon list: https://openweathermap.org/weather-conditions
 */
const OWM_ICON_MAP: Record<string, string> = {
  "01d": "sunny",
  "01n": "nights_stay",
  "02d": "partly_cloudy_day",
  "02n": "partly_cloudy_night",
  "03d": "cloud",
  "03n": "cloud",
  "04d": "cloud",
  "04n": "cloud",
  "09d": "rainy",
  "09n": "rainy",
  "10d": "rainy",
  "10n": "rainy",
  "11d": "thunderstorm",
  "11n": "thunderstorm",
  "13d": "ac_unit",
  "13n": "ac_unit",
  "50d": "foggy",
  "50n": "foggy",
};

export function getWeatherIcon(owmIconCode: string): string {
  return OWM_ICON_MAP[owmIconCode] ?? "partly_cloudy_day";
}
