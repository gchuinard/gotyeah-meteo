import type { ForecastItem } from "@/types/weather";
import { getWeatherIcon } from "@/lib/weatherIcons";

interface ForecastCardProps {
  item: ForecastItem;
  dayLabel: string;
  isActive?: boolean;
}

export function ForecastCard({ item, dayLabel, isActive = false }: ForecastCardProps) {
  const icon = getWeatherIcon(item.weather[0]?.icon ?? "");

  return (
    <div
      className={[
        "snap-start flex-shrink-0 w-28 backdrop-blur-xl rounded-xl p-4 flex flex-col items-center border",
        isActive
          ? "bg-sky-500/10 border-[#7bd0ff]/20"
          : "bg-[#222a3d]/40 border-white/5",
      ].join(" ")}
    >
      <span
        className={[
          "text-xs font-bold mb-4 uppercase",
          isActive ? "text-[#7bd0ff]" : "text-[#c6c6cd]",
        ].join(" ")}
      >
        {dayLabel}
      </span>

      <span
        className="material-symbols-outlined text-3xl text-[#7bd0ff] mb-4"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>

      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-white">
          {Math.round(item.temp_max)}°
        </span>
        <span className="text-xs text-[#c6c6cd]">
          {Math.round(item.temp_min)}°
        </span>
      </div>
    </div>
  );
}
