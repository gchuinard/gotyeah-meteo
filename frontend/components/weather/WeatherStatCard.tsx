interface WeatherStatCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
}

export function WeatherStatCard({ icon, label, value, unit }: WeatherStatCardProps) {
  return (
    <div className="bg-[#171f33]/40 backdrop-blur-2xl p-5 rounded-xl border border-white/5 flex flex-col justify-between h-36">
      {/* Header */}
      <div className="flex items-center gap-2 text-[#c6c6cd]">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>

      {/* Value */}
      <div>
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && (
          <span className="text-[#c6c6cd] text-sm ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}
