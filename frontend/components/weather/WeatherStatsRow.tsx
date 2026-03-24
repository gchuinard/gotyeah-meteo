import type { CurrentWeather } from "@/types/weather";

interface WeatherStatsRowProps {
  data: CurrentWeather;
}

export function WeatherStatsRow({ data }: WeatherStatsRowProps) {
  return (
    <section className="mb-10">
      <div className="bg-[#2d3449]/40 backdrop-blur-3xl rounded-xl p-6 flex justify-around items-center border border-white/5 shadow-xl">
        {/* Feels like */}
        <div className="text-center">
          <p className="text-[#c6c6cd] mb-1 text-xs">Feels like</p>
          <p className="text-xl font-bold text-white">
            {Math.round(data.feels_like)}°C
          </p>
        </div>

        <div className="h-8 w-px bg-[#45464d]/30" />

        {/* High */}
        <div className="text-center">
          <p className="text-[#c6c6cd] mb-1 text-xs uppercase tracking-widest">
            High
          </p>
          <p className="text-xl font-bold text-[#7bd0ff]">
            {Math.round(data.temp_max)}°C
          </p>
        </div>

        <div className="h-8 w-px bg-[#45464d]/30" />

        {/* Low */}
        <div className="text-center">
          <p className="text-[#c6c6cd] mb-1 text-xs uppercase tracking-widest">
            Low
          </p>
          <p className="text-xl font-bold text-[#c4c6d1]">
            {Math.round(data.temp_min)}°C
          </p>
        </div>
      </div>
    </section>
  );
}
