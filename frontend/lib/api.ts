const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchGeocode(city: string) {
  const res = await fetch(`${API_URL}/weather/geocode?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`Geocode failed: ${res.statusText}`);
  return res.json();
}

export async function fetchCurrentWeather(lat: number, lon: number) {
  const res = await fetch(`${API_URL}/weather/current?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`Current weather failed: ${res.statusText}`);
  return res.json();
}

export async function fetchForecast(lat: number, lon: number) {
  const res = await fetch(`${API_URL}/weather/forecast?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`Forecast failed: ${res.statusText}`);
  return res.json();
}
