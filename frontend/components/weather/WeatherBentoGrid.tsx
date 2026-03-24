import type { CurrentWeather } from "@/types/weather";
import { WeatherStatCard } from "./WeatherStatCard";

interface WeatherBentoGridProps {
  data: CurrentWeather;
}

function getUvLabel(uvi: number): string {
  if (uvi <= 2) return "Low";
  if (uvi <= 5) return "Moderate";
  if (uvi <= 7) return "High";
  if (uvi <= 10) return "Very High";
  return "Extreme";
}

export function WeatherBentoGrid({ data }: WeatherBentoGridProps) {
  return (
    <section className="mb-12 grid grid-cols-2 gap-4">
      <WeatherStatCard
        icon="air"
        label="Wind"
        value={Math.round(data.wind_speed * 3.6)} // m/s → km/h
        unit="km/h"
      />
      <WeatherStatCard
        icon="humidity_percentage"
        label="Humidity"
        value={data.humidity}
        unit="%"
      />
      <WeatherStatCard
        icon="compress"
        label="Pressure"
        value={data.visibility !== undefined ? "—" : "—"}
        unit="hPa"
      />
      <WeatherStatCard
        icon="visibility"
        label="Visibility"
        value={Math.round(data.visibility / 1000)}
        unit="km"
      />
    </section>
  );
}
