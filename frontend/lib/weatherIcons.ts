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

/**
 * Returns a hex color for a given OWM icon code.
 * Day/night variants share the same hue; night is slightly cooler/dimmer.
 */
const WEATHER_COLORS: Record<string, string> = {
  // ☀️ Clear
  "01d": "#FFA726", // warm orange-yellow
  "01n": "#7986CB", // soft indigo night

  // 🌤 Few clouds
  "02d": "#FFB74D",
  "02n": "#5C6BC0",

  // ⛅ Scattered clouds
  "03d": "#90A4AE",
  "03n": "#546E7A",

  // ☁️ Broken / overcast
  "04d": "#78909C",
  "04n": "#455A64",

  // 🌧 Shower rain
  "09d": "#4FC3F7",
  "09n": "#0288D1",

  // 🌦 Rain
  "10d": "#42A5F5",
  "10n": "#1565C0",

  // ⛈ Thunderstorm
  "11d": "#7E57C2",
  "11n": "#4527A0",

  // ❄️ Snow
  "13d": "#B3E5FC",
  "13n": "#80DEEA",

  // 🌫 Mist / fog
  "50d": "#B0BEC5",
  "50n": "#78909C",
};

export function getWeatherColor(owmIconCode: string): string {
  return WEATHER_COLORS[owmIconCode] ?? "#90A4AE";
}
