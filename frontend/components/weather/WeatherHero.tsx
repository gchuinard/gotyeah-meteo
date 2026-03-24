import type { CurrentWeather } from "@/types/weather";
import { getWeatherIcon } from "@/lib/weatherIcons";

interface WeatherHeroProps {
  data: CurrentWeather;
}

export function WeatherHero({ data }: WeatherHeroProps) {
  const condition = data.weather[0];
  const icon = getWeatherIcon(condition?.icon ?? "");

  return (
    <section className="mb-12 text-center md:text-left">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between">
        {/* Left — city + temperature */}
        <div>
          <h1 className="text-3xl font-bold text-[#dae2fd] tracking-tight mb-1">
            {data.city}, {data.country}
          </h1>
          <p className="text-[#c6c6cd] font-medium tracking-wide uppercase text-sm mb-6">
            {condition?.description ?? ""}
          </p>
          <div className="flex items-start justify-center md:justify-start">
            <span className="text-[7rem] md:text-[8rem] font-black leading-none text-white tracking-tighter">
              {Math.round(data.temp)}°
            </span>
            <span className="text-3xl md:text-4xl font-bold text-[#7bd0ff] mt-4">
              C
            </span>
          </div>
        </div>

        {/* Right — weather icon */}
        <div className="mt-8 md:mt-0 flex flex-col items-center md:items-end">
          <span
            className="material-symbols-outlined text-8xl md:text-9xl text-[#7bd0ff] mb-4"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
      </div>
    </section>
  );
}
