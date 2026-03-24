interface TopNavProps {
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
}

export function TopNav({ onSearchClick, onSettingsClick }: TopNavProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-slate-900/40 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,30,44,0.06)] bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex justify-between items-center px-6 py-4 w-full max-w-none">
        <div className="text-2xl font-black text-slate-50 tracking-tighter">
          WeatherNow
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onSearchClick}
            className="p-2 text-sky-400 hover:bg-white/10 transition-colors duration-300 active:scale-95"
            aria-label="Search"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          <button
            onClick={onSettingsClick}
            className="p-2 text-slate-400 hover:bg-white/10 transition-colors duration-300 active:scale-95"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
