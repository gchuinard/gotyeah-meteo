import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { WeatherStatsRow } from "@/components/weather/WeatherStatsRow";
import { WeatherBentoGrid } from "@/components/weather/WeatherBentoGrid";
import { ForecastSection } from "@/components/weather/ForecastSection";
import type { CurrentWeather, Forecast } from "@/types/weather";

// ── Mock data (will be replaced by API calls in Sprint 1) ─────────────────
const MOCK_CURRENT: CurrentWeather = {
  city: "Paris",
  country: "France",
  lat: 48.8566,
  lon: 2.3522,
  temp: 18,
  feels_like: 16,
  temp_min: 12,
  temp_max: 21,
  humidity: 62,
  wind_speed: 3.9,  // m/s → ~14 km/h
  wind_deg: 210,
  visibility: 10000,
  weather: [{ id: 802, main: "Clouds", description: "Partly Cloudy", icon: "02d" }],
  dt: 1711270800,
  sunrise: 1711247400,
  sunset: 1711293600,
};

const MOCK_FORECAST: Forecast = {
  city: "Paris",
  country: "France",
  items: [
    { dt: 1711270800, temp: 18, temp_min: 14, temp_max: 22, humidity: 60, weather: [{ id: 800, main: "Clear",  description: "Sunny",          icon: "01d" }], wind_speed: 3.0, pop: 0 },
    { dt: 1711357200, temp: 18, temp_min: 12, temp_max: 21, humidity: 62, weather: [{ id: 802, main: "Clouds", description: "Partly Cloudy",  icon: "02d" }], wind_speed: 3.9, pop: 0.1 },
    { dt: 1711443600, temp: 17, temp_min: 11, temp_max: 19, humidity: 68, weather: [{ id: 803, main: "Clouds", description: "Cloudy",         icon: "03d" }], wind_speed: 4.2, pop: 0.2 },
    { dt: 1711530000, temp: 15, temp_min: 10, temp_max: 17, humidity: 75, weather: [{ id: 500, main: "Rain",   description: "Rainy",          icon: "10d" }], wind_speed: 5.1, pop: 0.7 },
    { dt: 1711616400, temp: 19, temp_min: 13, temp_max: 21, humidity: 58, weather: [{ id: 802, main: "Clouds", description: "Partly Cloudy",  icon: "02d" }], wind_speed: 3.5, pop: 0.1 },
    { dt: 1711702800, temp: 24, temp_min: 16, temp_max: 26, humidity: 45, weather: [{ id: 800, main: "Clear",  description: "Sunny",          icon: "01d" }], wind_speed: 2.8, pop: 0 },
    { dt: 1711789200, temp: 23, temp_min: 15, temp_max: 25, humidity: 48, weather: [{ id: 800, main: "Clear",  description: "Sunny",          icon: "01d" }], wind_speed: 3.1, pop: 0 },
  ],
};

export default function HomePage() {
  return (
    <div className="min-h-screen pb-32">
      <TopNav />

      {/* Condition glow background */}
      <div className="fixed top-[-10%] left-[10%] w-[80%] h-[50%] bg-[#7bd0ff]/10 rounded-full blur-[120px] -z-10" />

      <main className="pt-24 px-6 max-w-4xl mx-auto">
        <WeatherHero data={MOCK_CURRENT} />
        <WeatherStatsRow data={MOCK_CURRENT} />
        <WeatherBentoGrid data={MOCK_CURRENT} />
        <ForecastSection forecast={MOCK_FORECAST} />
      </main>

      <BottomNav />
    </div>
  );
}
