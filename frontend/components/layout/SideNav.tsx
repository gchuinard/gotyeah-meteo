"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface Theme {
  id:           string;
  name:         string;
  light:        boolean;
  primary:      string;
  tertiary:     string;
  bg:           string;
  surfaceCl:    string;
  surfaceC:     string;
  surfaceCh:    string;
  surfaceCgh:   string;
  onSurface:    string;
  onSurfaceV:   string;
  onPrimary:    string;
}

const THEMES: Theme[] = [
  {
    id: "ocean", name: "Océan", light: false,
    primary:    "123 208 255", tertiary:   "222 194 154",
    bg:         "11 19 38",    surfaceCl:  "6 14 32",
    surfaceC:   "23 31 51",    surfaceCh:  "34 42 61",
    surfaceCgh: "45 52 73",
    onSurface:  "218 226 253", onSurfaceV: "198 198 205", onPrimary: "0 53 74",
  },
  {
    id: "aurora", name: "Aurora", light: false,
    primary:    "105 240 174", tertiary:   "234 128 252",
    bg:         "10 20 14",    surfaceCl:  "5 12 8",
    surfaceC:   "18 32 22",    surfaceCh:  "28 44 32",
    surfaceCgh: "40 58 44",
    onSurface:  "210 248 225", onSurfaceV: "180 210 190", onPrimary: "5 60 30",
  },
  {
    id: "sunset", name: "Coucher de soleil", light: false,
    primary:    "255 138 101", tertiary:   "255 213 79",
    bg:         "22 10 8",     surfaceCl:  "14 6 4",
    surfaceC:   "36 18 12",    surfaceCh:  "50 26 18",
    surfaceCgh: "66 34 24",
    onSurface:  "255 222 210", onSurfaceV: "220 180 165", onPrimary: "80 20 0",
  },
  {
    id: "midnight", name: "Minuit", light: false,
    primary:    "206 147 216", tertiary:   "128 222 234",
    bg:         "8 8 18",      surfaceCl:  "4 4 12",
    surfaceC:   "16 14 32",    surfaceCh:  "26 22 46",
    surfaceCgh: "38 32 62",
    onSurface:  "230 220 255", onSurfaceV: "190 180 220", onPrimary: "50 10 70",
  },
  {
    id: "jour", name: "Jour", light: true,
    primary:    "14 120 200",  tertiary:   "200 100 10",
    bg:         "238 244 255", surfaceCl:  "255 255 255",
    surfaceC:   "255 255 255", surfaceCh:  "232 240 255",
    surfaceCgh: "215 228 252",
    onSurface:  "10 16 40",    onSurfaceV: "70 80 120",   onPrimary: "255 255 255",
  },
  {
    id: "pastel", name: "Pastel", light: true,
    primary:    "130 60 200",  tertiary:   "210 60 110",
    bg:         "248 244 255", surfaceCl:  "255 255 255",
    surfaceC:   "255 255 255", surfaceCh:  "242 236 255",
    surfaceCgh: "228 218 252",
    onSurface:  "28 10 45",    onSurfaceV: "90 70 120",   onPrimary: "255 255 255",
  },
];
import type {
  Units, TempUnit, WindUnit, PressureUnit, PrecipUnit,
  VisUnit, TimeFormat, DateFormat, DistUnit, HeightUnit,
} from "@/lib/units";

interface Props {
  units: Units;
  onUnitsChange: (u: Units) => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

function UnitGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
              opt.value === value
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SideNav({ units, onUnitsChange, onOpenLogin, onOpenRegister }: Props) {
  const set = <K extends keyof Units>(key: K, val: Units[K]) =>
    onUnitsChange({ ...units, [key]: val });

  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [pseudo, setPseudo]           = useState("");
  const [savedPseudo, setSavedPseudo] = useState("");
  const [themeId, setThemeId]         = useState("ocean");

  useEffect(() => {
    const t = THEMES.find(t => t.id === themeId) ?? THEMES[0];
    const root = document.documentElement;
    root.style.setProperty("--wn-primary",      t.primary);
    root.style.setProperty("--wn-tertiary",     t.tertiary);
    root.style.setProperty("--wn-bg",           t.bg);
    root.style.setProperty("--wn-surface-cl",   t.surfaceCl);
    root.style.setProperty("--wn-surface-c",    t.surfaceC);
    root.style.setProperty("--wn-surface-ch",   t.surfaceCh);
    root.style.setProperty("--wn-surface-cgh",  t.surfaceCgh);
    root.style.setProperty("--wn-on-surface",   t.onSurface);
    root.style.setProperty("--wn-on-surface-v", t.onSurfaceV);
    root.style.setProperty("--wn-on-primary",   t.onPrimary);
    if (t.light) {
      root.setAttribute("data-light", "true");
    } else {
      root.removeAttribute("data-light");
    }
  }, [themeId]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 z-50 flex-col bg-background shadow-[32px_0_64px_-20px_rgba(0,30,44,0.06)]">

        {/* Logo */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <h1 className="text-2xl font-black tracking-tighter text-primary">WeatherNow</h1>
          <p className="text-xs text-on-surface-variant tracking-widest mt-1 uppercase">Paris, FR</p>
        </div>

        {/* Nav */}
        <nav className="px-4 flex-shrink-0">
          {user ? (
            <>
              <button
                onClick={() => { setPseudo(savedPseudo); setProfileOpen(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              >
                <span className="material-symbols-outlined">person</span>
                {savedPseudo || "Profil"}
              </button>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-red-400 hover:bg-red-400/5"
              >
                <span className="material-symbols-outlined">logout</span>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenLogin}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              >
                <span className="material-symbols-outlined">login</span>
                Connexion
              </button>
              <button
                onClick={onOpenRegister}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              >
                <span className="material-symbols-outlined">person_add</span>
                Créer un compte
              </button>
            </>
          )}
        </nav>

        {/* Divider */}
        <div className="mx-6 my-4 border-t border-white/5 flex-shrink-0" />

        {/* Preferences — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5" style={{ scrollbarWidth: "none" }}>
          <p className="text-xs font-bold text-on-surface uppercase tracking-widest">Préférences</p>

          <UnitGroup<TempUnit>
            label="Température"
            value={units.temp}
            onChange={(v) => set("temp", v)}
            options={[
              { label: "°C", value: "C" },
              { label: "°F", value: "F" },
              { label: "K",  value: "K" },
            ]}
          />

          <UnitGroup<WindUnit>
            label="Vitesse du vent"
            value={units.wind}
            onChange={(v) => set("wind", v)}
            options={[
              { label: "km/h", value: "kmh" },
              { label: "mph",  value: "mph" },
              { label: "m/s",  value: "ms"  },
              { label: "kt",   value: "kt"  },
            ]}
          />

          <UnitGroup<PressureUnit>
            label="Pression"
            value={units.pressure}
            onChange={(v) => set("pressure", v)}
            options={[
              { label: "hPa",  value: "hPa"  },
              { label: "mbar", value: "mbar" },
              { label: "inHg", value: "inHg" },
              { label: "mmHg", value: "mmHg" },
            ]}
          />

          <UnitGroup<PrecipUnit>
            label="Précipitations"
            value={units.precip}
            onChange={(v) => set("precip", v)}
            options={[
              { label: "mm", value: "mm" },
              { label: "in", value: "in" },
            ]}
          />

          <UnitGroup<VisUnit>
            label="Visibilité"
            value={units.vis}
            onChange={(v) => set("vis", v)}
            options={[
              { label: "km", value: "km" },
              { label: "mi", value: "mi" },
            ]}
          />

          <UnitGroup<TimeFormat>
            label="Format horaire"
            value={units.time}
            onChange={(v) => set("time", v)}
            options={[
              { label: "24h",   value: "24h" },
              { label: "AM/PM", value: "12h" },
            ]}
          />

          <UnitGroup<DateFormat>
            label="Format de date"
            value={units.date}
            onChange={(v) => set("date", v)}
            options={[
              { label: "JJ/MM/AAAA", value: "DD/MM/YYYY" },
              { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
              { label: "AAAA-MM-JJ", value: "YYYY-MM-DD" },
            ]}
          />

          <UnitGroup<DistUnit>
            label="Distance"
            value={units.distance}
            onChange={(v) => set("distance", v)}
            options={[
              { label: "km", value: "km" },
              { label: "mi", value: "mi" },
            ]}
          />

          <UnitGroup<HeightUnit>
            label="Hauteur (nuages / neige)"
            value={units.height}
            onChange={(v) => set("height", v)}
            options={[
              { label: "cm", value: "cm" },
              { label: "in", value: "in" },
              { label: "ft", value: "ft" },
            ]}
          />
        </div>

      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 w-full z-50 rounded-t-[1.5rem] bg-surface-container-lowest/40 backdrop-blur-3xl shadow-[0_-8px_32px_0_rgba(0,30,44,0.06)]">
        <div className="flex justify-around items-center px-4 pb-6 pt-2">
          <button
            onClick={() => { setPseudo(savedPseudo); setProfileOpen(true); }}
            className="flex flex-col items-center justify-center px-4 py-2 rounded-xl active:scale-90 transition-all duration-200 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-medium uppercase tracking-widest mt-1">Profil</span>
          </button>
        </div>
      </nav>

      {/* Profile modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-container-lowest border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Profil</h2>
            {user && <p className="text-xs text-on-surface-variant mb-6">{user.email}</p>}
            {!user && <div className="mb-6" />}

            {/* Theme picker */}
            <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider mb-1">Ambiance</p>
            <p className="text-[10px] text-on-surface-variant mb-3">Mode sombre</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {THEMES.filter(t => !t.light).map((t) => {
                const isActive = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    className={[
                      "relative flex flex-col items-start gap-2 p-3 rounded-2xl border transition-all",
                      isActive ? "border-white/30 bg-white/5" : "border-white/5 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.bg})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.primary})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.tertiary})` }} />
                    </div>
                    <span className="text-xs font-semibold text-on-surface">{t.name}</span>
                    {isActive && (
                      <span className="absolute top-2 right-2 material-symbols-outlined text-sm" style={{ color: `rgb(${t.primary})`, fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-on-surface-variant mb-3">Mode clair</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {THEMES.filter(t => t.light).map((t) => {
                const isActive = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    className={[
                      "relative flex flex-col items-start gap-2 p-3 rounded-2xl border transition-all",
                      isActive ? "border-white/30 bg-white/5" : "border-white/5 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: `rgb(${t.bg})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.primary})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.tertiary})` }} />
                    </div>
                    <span className="text-xs font-semibold text-on-surface">{t.name}</span>
                    {isActive && (
                      <span className="absolute top-2 right-2 material-symbols-outlined text-sm" style={{ color: `rgb(${t.primary})`, fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <label className="block text-xs text-on-surface-variant font-semibold uppercase tracking-wider mb-2">
              Pseudo
            </label>
            <input
              autoFocus
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Entrez votre pseudo…"
              className="w-full bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all mb-8"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setProfileOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { setSavedPseudo(pseudo.trim()); setProfileOpen(false); }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 transition-all"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
