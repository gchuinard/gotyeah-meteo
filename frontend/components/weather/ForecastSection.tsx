import type { Forecast } from "@/types/weather";
import { ForecastCard } from "./ForecastCard";

interface ForecastSectionProps {
  forecast: Forecast;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ForecastSection({ forecast }: ForecastSectionProps) {
  return (
    <section className="mb-12">
      <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-6 px-1">
        7-Day Forecast
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
        {forecast.items.map((item, index) => {
          const date = new Date(item.dt * 1000);
          const dayLabel = DAY_NAMES[date.getDay()];
          return (
            <ForecastCard
              key={item.dt}
              item={item}
              dayLabel={dayLabel}
              isActive={index === 0}
            />
          );
        })}
      </div>
    </section>
  );
}
