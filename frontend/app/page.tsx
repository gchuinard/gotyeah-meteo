"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SideNav } from "@/components/layout/SideNav";
import { TRANSLATIONS, type Lang } from "@/lib/translations";
import { useWeather } from "@/hooks/useWeather";
import { fetchCurrentWeather } from "@/lib/api";
import { getWeatherIcon, getWeatherColor } from "@/lib/weatherIcons";
import { SearchAutocomplete } from "@/components/weather/SearchAutocomplete";
import { DEFAULT_UNITS, fmtTempVal, fmtWind, fmtPressure, fmtVis, fmtDate, fmtPrecip, serializeUnits, parseUnits, type Units } from "@/lib/units";
import type { CurrentWeather } from "@/types/weather";
import { useAuth } from "@/context/AuthContext";
import { apiGetFavorites, apiAddFavorite, apiDeleteFavorite, apiGetPreferences, apiUpdatePreferences, apiReorderFavorites } from "@/lib/api/user";
import { apiAdminPing } from "@/lib/api/admin";

const LOCALE_MAP: Record<Lang, string> = {
  EN: "en-US", FR: "fr-FR", ES: "es-ES", DE: "de-DE", JA: "ja-JP",
};

const LANGUAGES: Lang[] = ["EN", "FR", "ES", "DE", "JA"];

const DEFAULT_FAVORITES: FavoriteItem[] = [
  { city: "London",   lat: 51.5074, lon: -0.1278,  bgColor: "bg-primary/10",   iconColor: "text-primary"    },
  { city: "New York", lat: 40.7128, lon: -74.0060, bgColor: "bg-tertiary/10", iconColor: "text-tertiary"  },
];

interface FavoriteItem {
  id?: string;
  city: string;
  lat: number;
  lon: number;
  bgColor: string;
  iconColor: string;
}

const FAV_COLORS = [
  { bgColor: "bg-primary/10",    iconColor: "text-primary"    },
  { bgColor: "bg-tertiary/10",  iconColor: "text-tertiary"  },
  { bgColor: "bg-emerald-400/10",iconColor: "text-emerald-400"},
  { bgColor: "bg-violet-400/10", iconColor: "text-violet-400" },
  { bgColor: "bg-rose-400/10",   iconColor: "text-rose-400"   },
];

// Deux positions sont considérées identiques si elles sont à moins de ~5 km —
// évite les faux doublons entre villes homonymes (Paris FR vs Paris TX)
function sameLocation(a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  return Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.lon - b.lon) < 0.05;
}

// Ville "domicile" — choisie par l'utilisateur, prioritaire sur la géolocalisation au chargement
const LS_HOME_CITY = "wn_home_city";

interface HomeCity {
  name: string;
  lat: number;
  lon: number;
}

function getHomeCity(): HomeCity | null {
  try {
    const raw = localStorage.getItem(LS_HOME_CITY);
    return raw ? (JSON.parse(raw) as HomeCity) : null;
  } catch {
    return null;
  }
}

function storeHomeCity(city: HomeCity | null): void {
  if (city) localStorage.setItem(LS_HOME_CITY, JSON.stringify(city));
  else localStorage.removeItem(LS_HOME_CITY);
}

function owmConditionKey(main: string, description: string): string {
  switch (main) {
    case "Clear":       return "sunny";
    case "Clouds":      return (description.includes("few") || description.includes("scattered")) ? "partlyCloudy" : "cloudy";
    case "Rain":        return description.includes("heavy") ? "heavyRain" : "lightRain";
    case "Drizzle":     return "lightRain";
    case "Thunderstorm":return "thunderstorm";
    case "Snow":        return "snow";
    default:            return "cloudy";
  }
}

function getUvLabel(uvi: number, tr: Record<string, string>): string {
  if (uvi <= 2)  return tr.uvLow       ?? "Low";
  if (uvi <= 5)  return tr.uvModerate  ?? "Moderate";
  if (uvi <= 7)  return tr.uvHigh      ?? "High";
  if (uvi <= 10) return tr.uvVeryHigh  ?? "Very High";
  return tr.uvExtreme ?? "Extreme";
}

function getAqiLabel(aqi: number, tr: Record<string, string>): string {
  const keys = ["aqiGood", "aqiFair", "aqiModerate", "aqiPoor", "aqiVeryPoor"];
  return tr[keys[aqi - 1]] ?? "—";
}

function formatHour(dt: number, fmt: "24h" | "12h"): string {
  return new Date(dt * 1000).toLocaleTimeString("en", {
    hour: "numeric",
    hour12: fmt === "12h",
    ...(fmt === "24h" ? { minute: "2-digit" } : {}),
  });
}

function TempCurve({ temps, hours, nowLabel }: { temps: number[]; hours: string[]; nowLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const H = 200; const PX_L = 44; const PX_R = 34; const PY_TOP = 28; const PY_BOT = 28;
  const n = temps.length;
  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const x = (i: number) => PX_L + (i / (n - 1)) * (width - PX_L - PX_R);
  const y = (t: number) => PY_TOP + (1 - (t - minT) / (maxT - minT)) * (H - PY_TOP - PY_BOT);

  const smooth = temps.map((t, i) => {
    if (i === 0) return `M${x(0)},${y(t)}`;
    const cpx = (x(i - 1) + x(i)) / 2;
    return `C${cpx},${y(temps[i - 1])} ${cpx},${y(t)} ${x(i)},${y(t)}`;
  }).join(" ");
  const area = smooth + ` L${x(n - 1)},${H} L${x(0)},${H} Z`;

  return (
    <div ref={containerRef} className="mt-4 bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="material-symbols-outlined text-primary text-base">thermostat</span>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Température</p>
      </div>
      <div className="relative" style={{ height: H }}>
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
          <defs>
            <linearGradient id="tempLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#93c5fd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#tempAreaGrad)" />
          <path d={smooth} fill="none" stroke="url(#tempLineGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {temps.map((t, i) => {
            const ratio = (t - minT) / (maxT - minT);
            const r = Math.round(96  + (251 - 96)  * ratio);
            const g = Math.round(165 + (191 - 165) * ratio);
            const b = Math.round(250 + (36  - 250) * ratio);
            const dotColor = `rgb(${r},${g},${b})`;
            return (
            <g key={i}>
              <circle cx={x(i)} cy={y(t)} r="4" fill="#1e293b" stroke={dotColor} strokeWidth="2" />
              <text x={x(i)} y={y(t) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="white">{t}°</text>
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={i === 0 ? "#60a5fa" : "rgba(255,255,255,0.45)"}
                fontWeight={i === 0 ? "700" : "400"}>
                {hours[i]}
              </text>
            </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SunArc({ sunrise, sunset, timeFmt, tr }: {
  sunrise: number;
  sunset: number;
  timeFmt: "24h" | "12h";
  tr: Record<string, string>;
}) {
  const W = 280, H = 132, cx = 140, cy = 110, rx = 116, ry = 86;

  // Heure de montage du composant — une capture unique suffit à positionner le soleil
  const [now] = useState(() => Date.now() / 1000);
  const span = sunset - sunrise;
  const progress = span > 0 ? Math.min(Math.max((now - sunrise) / span, 0), 1) : 0.5;
  const isDay = now >= sunrise && now <= sunset;

  // Arc semi-elliptique : φ va de π (lever, à gauche) à 0 (coucher, à droite)
  const phi = Math.PI * (1 - progress);
  const sunX = cx + rx * Math.cos(phi);
  const sunY = cy - ry * Math.sin(phi);

  const fmtSun = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString("en-US", {
      hour: timeFmt === "12h" ? "numeric" : "2-digit",
      minute: "2-digit",
      hour12: timeFmt === "12h",
    });

  return (
    <div className="bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-amber-400 text-base">wb_sunny</span>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{tr.sun ?? "Sun"}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1="12" y1={cy} x2={W - 12} y2={cy} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="3 5" />
        <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${sunX} ${sunY}`}
          fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={sunX} cy={sunY} r="7" fill={isDay ? "#fbbf24" : "#64748b"} stroke="#1e293b" strokeWidth="2.5" />
      </svg>
      <div className="flex justify-between mt-1">
        <div>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{tr.sunrise ?? "Sunrise"}</p>
          <p className="text-sm font-bold">{fmtSun(sunrise)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{tr.sunset ?? "Sunset"}</p>
          <p className="text-sm font-bold">{fmtSun(sunset)}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, accessToken, getToken, login, register } = useAuth();
  const [lang, setLang]           = useState<Lang>("FR");
  const [langOpen, setLangOpen]   = useState(false);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "denied" | "ok">("idle");
  const [locCity, setLocCity]     = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>(DEFAULT_FAVORITES);
  const [favData, setFavData]     = useState<(CurrentWeather | null)[]>([null, null]);
  const [units, setUnits]         = useState<Units>(DEFAULT_UNITS);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [homeCity, setHomeCity]       = useState<HomeCity | null>(null);
  const [draggedFav, setDraggedFav]   = useState<number | null>(null);
  const [dragOverFav, setDragOverFav] = useState<number | null>(null);

  // Auth modals
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
  const [authEmail, setAuthEmail]       = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm]   = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError]       = useState<string | null>(null);
  const [authLoading, setAuthLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  function resetAuth() { setAuthEmail(""); setAuthPassword(""); setAuthConfirm(""); setAuthUsername(""); setAuthError(null); setShowPassword(false); setShowConfirm(false); }
  function openLogin()    { setAuthModal("login");    resetAuth(); }
  function openRegister() { setAuthModal("register"); resetAuth(); }
  function closeAuth()    { setAuthModal(null); }

  function mapApiError(msg: string, t: Record<string, string>): string {
    if (msg.includes("already registered") || msg.includes("already in use")) return t.errEmailTaken;
    if (msg.includes("Could not validate") || msg.includes("401") || msg.includes("Unauthorized")) return t.errInvalidCredentials;
    if (msg.includes("NetworkError") || msg.includes("Failed to fetch") || msg.includes("network")) return t.errNetwork;
    if (msg.includes("422") || msg.includes("Unprocessable")) return t.errPasswordWeak;
    return t.errServer;
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const t = TRANSLATIONS[lang];
    if (authModal === "register") {
      const hasMin = authPassword.length >= 8;
      const hasUpper = /[A-Z]/.test(authPassword);
      const hasNum = /[0-9]/.test(authPassword);
      const hasSpecial = /[^a-zA-Z0-9]/.test(authPassword);
      if (!hasMin || !hasUpper || !hasNum || !hasSpecial) { setAuthError(t.errPasswordWeak); return; }
      if (authPassword !== authConfirm) { setAuthError(t.errPasswordNoMatch); return; }
      if (authUsername.trim().length < 2) { setAuthError(t.errUsernameRequired); return; }
    }
    setAuthLoading(true);
    try {
      if (authModal === "login")    await login(authEmail, authPassword);
      if (authModal === "register") await register(authEmail, authPassword, authUsername);
      closeAuth();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      setAuthError(mapApiError(raw, TRANSLATIONS[lang]));
    } finally {
      setAuthLoading(false);
    }
  }

  const { current, forecast, loading, error, search, searchByCoords } = useWeather();
  const tr = TRANSLATIONS[lang];

  // Check admin status when user logs in
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    getToken().then((token) => apiAdminPing(token)).then(setIsAdmin).catch(() => setIsAdmin(false));
    // getToken volontairement hors deps : on ne re-vérifie qu'au changement d'utilisateur,
    // pas à chaque rotation de token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load favorites from API when authenticated
  useEffect(() => {
    if (!user || !accessToken) {
      setFavorites(DEFAULT_FAVORITES);
      return;
    }
    apiGetFavorites(accessToken).then((apiFavs) => {
      if (apiFavs.length === 0) return; // pas de favoris sauvegardés → garde les défauts
      setFavorites(
        apiFavs.map((f, i) => ({
          id: f.id,
          city: f.city_name,
          lat: f.lat,
          lon: f.lon,
          bgColor: FAV_COLORS[i % FAV_COLORS.length].bgColor,
          iconColor: FAV_COLORS[i % FAV_COLORS.length].iconColor,
        }))
      );
    }).catch(() => {});
  }, [user, accessToken]);

  // Load unit preferences from API when authenticated
  useEffect(() => {
    if (!user || !accessToken) return;
    apiGetPreferences(accessToken)
      .then((prefs) => setUnits(parseUnits(prefs.unit_system)))
      .catch(() => {});
  }, [user, accessToken]);

  useEffect(() => {
    Promise.all(
      favorites.map(({ lat, lon }) => fetchCurrentWeather(lat, lon).catch(() => null))
    ).then(setFavData);
  }, [favorites]);

  useEffect(() => {
    // Une ville "domicile" enregistrée est prioritaire sur la géolocalisation au chargement
    const home = getHomeCity();
    setHomeCity(home);
    if (home) {
      searchByCoords(home.lat, home.lon, home.name);
      return;
    }

    if (!navigator.geolocation) {
      search("Paris");
      return;
    }

    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Paris";
          setLocCity(city);
          setLocStatus("ok");
          search(city);
        } catch {
          setLocStatus("idle");
          search("Paris");
        }
      },
      () => {
        setLocStatus("denied");
        search("Paris");
      },
      // maximumAge: 0 — force une position fraîche plutôt qu'un fix mis en cache
      { timeout: 8000, maximumAge: 0 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Paris";
          setLocCity(city);
          setLocStatus("ok");
          search(city);
        } catch {
          // Échec du géocodage inverse — on charge quand même une météo par défaut
          setLocStatus("idle");
          search("Paris");
        }
      },
      () => setLocStatus("denied"),
      // maximumAge: 0 — force une position fraîche plutôt qu'un fix mis en cache
      { timeout: 8000, maximumAge: 0 }
    );
  }

  // Met à jour les unités et les persiste côté backend si l'utilisateur est connecté
  const handleUnitsChange = (u: Units) => {
    setUnits(u);
    if (user) {
      getToken()
        .then((token) => apiUpdatePreferences(token, { unit_system: serializeUnits(u) }))
        .catch(() => {});
    }
  };

  // Définit (ou retire) la ville actuellement affichée comme ville "domicile" (localStorage)
  const handleToggleHome = () => {
    if (!current) return;
    const isHome = homeCity != null && sameLocation(homeCity, current);
    const next = isHome ? null : { name: current.city, lat: current.lat, lon: current.lon };
    storeHomeCity(next);
    setHomeCity(next);
  };

  // Réordonne les favoris par glisser-déposer et persiste l'ordre si l'utilisateur est connecté
  const handleDropFav = (targetIndex: number) => {
    const from = draggedFav;
    setDraggedFav(null);
    setDragOverFav(null);
    if (from === null || from === targetIndex) return;

    const newFavorites = [...favorites];
    const [moved] = newFavorites.splice(from, 1);
    newFavorites.splice(targetIndex, 0, moved);
    setFavorites(newFavorites);
    setFavData((prev) => {
      const copy = [...prev];
      const [m] = copy.splice(from, 1);
      copy.splice(targetIndex, 0, m);
      return copy;
    });

    // Persistance : uniquement si tous les favoris ont un id (utilisateur connecté)
    const items = newFavorites
      .map((f, i) => ({ id: f.id, position: i }))
      .filter((it): it is { id: string; position: number } => Boolean(it.id));
    if (user && items.length === newFavorites.length) {
      getToken()
        .then((token) => apiReorderFavorites(token, items))
        .catch(() => {});
    }
  };

  const dateStr = current
    ? `${new Date(current.dt * 1000).toLocaleDateString(LOCALE_MAP[lang], { weekday: "long" })} · ${fmtDate(current.dt, units.date)}`
    : "—";

  const condKey   = current ? owmConditionKey(current.weather[0].main, current.weather[0].description) : "partlyCloudy";
  const condIcon  = current ? getWeatherIcon(current.weather[0].icon) : "partly_cloudy_day";
  const condColor = current ? getWeatherColor(current.weather[0].icon) : "#90A4AE";

  const allItems  = forecast?.items ?? [];
  const overallMin = allItems.length ? Math.min(...allItems.map(f => f.temp_min)) : 0;
  const overallMax = allItems.length ? Math.max(...allItems.map(f => f.temp_max)) : 40;
  const range      = overallMax - overallMin || 1;

  const hourly = forecast?.hourly ?? [];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <SideNav units={units} onUnitsChange={handleUnitsChange} onOpenLogin={openLogin} onOpenRegister={openRegister} />

      <div className="lg:ml-64 min-h-screen relative overflow-x-hidden">

        {/* Top bar */}
        <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-20 z-40 flex justify-between items-center px-6 lg:px-8 bg-background/80 backdrop-blur-xl">
          <div className="hidden sm:block lg:hidden text-xl font-black tracking-tighter text-primary">WeatherNow</div>

          <div className="hidden lg:flex flex-1 max-w-xl">
            <SearchAutocomplete onSelect={search} placeholder={tr.searchPlaceholder} />
          </div>
          <div className="flex lg:hidden flex-1 max-w-xs ml-2">
            <SearchAutocomplete onSelect={search} placeholder={tr.searchPlaceholder} />
          </div>

          <div className="flex items-center gap-4 ml-6">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="w-10 h-10 rounded-full bg-slate-700/80 hover:bg-slate-600/80 border border-white/10 flex items-center justify-center text-xs font-bold text-on-surface transition-all hover:scale-105 active:scale-95"
              >
                {lang}
              </button>
              {langOpen && (
                <div className="absolute right-0 top-12 bg-surface-container/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl z-50 min-w-[80px]">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setLangOpen(false); }}
                      className={["w-full px-4 py-2.5 text-sm font-medium text-left transition-colors",
                        l === lang ? "bg-primary/20 text-primary" : "text-on-surface hover:bg-white/5",
                      ].join(" ")}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                Admin
              </Link>
            )}
            {user && (
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary select-none">
                {user.email[0].toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Loading skeleton */}
        {loading && (
          <div className="pt-24 px-4 lg:px-8 pb-12 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* Hero skeleton */}
              <div className="lg:col-span-2 bg-surface-variant/20 rounded-3xl p-8 flex flex-col gap-6 min-h-[340px]">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-28 bg-surface-variant/50 rounded-full" />
                    <div className="h-10 w-48 bg-surface-variant/50 rounded-full" />
                    <div className="h-4 w-36 bg-surface-variant/30 rounded-full" />
                  </div>
                  <div className="w-20 h-20 bg-surface-variant/40 rounded-full" />
                </div>
                <div className="h-16 w-32 bg-surface-variant/50 rounded-2xl" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-auto">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-surface-variant/30 rounded-2xl p-4 flex flex-col gap-2">
                      <div className="h-3 w-16 bg-surface-variant/50 rounded-full" />
                      <div className="h-5 w-12 bg-surface-variant/50 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Favorites skeleton */}
              <div className="flex flex-col gap-4">
                <div className="h-10 w-full bg-surface-variant/20 rounded-2xl" />
                <div className="bg-surface-variant/20 rounded-3xl p-5 flex flex-col gap-3">
                  <div className="h-4 w-24 bg-surface-variant/40 rounded-full mb-1" />
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-variant/20 rounded-2xl p-4">
                      <div className="space-y-1.5">
                        <div className="h-4 w-20 bg-surface-variant/50 rounded-full" />
                        <div className="h-3 w-14 bg-surface-variant/30 rounded-full" />
                      </div>
                      <div className="h-7 w-12 bg-surface-variant/40 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hourly forecast skeleton */}
            <div className="bg-surface-variant/20 rounded-3xl p-6 mb-6">
              <div className="h-4 w-36 bg-surface-variant/40 rounded-full mb-5" />
              <div className="flex gap-3 overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 bg-surface-variant/20 rounded-2xl px-4 py-4 w-16">
                    <div className="h-3 w-10 bg-surface-variant/40 rounded-full" />
                    <div className="w-8 h-8 bg-surface-variant/40 rounded-full" />
                    <div className="h-4 w-8 bg-surface-variant/50 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* 7-day skeleton */}
            <div className="bg-surface-variant/20 rounded-3xl p-6">
              <div className="h-4 w-40 bg-surface-variant/40 rounded-full mb-5" />
              <div className="flex flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2">
                    <div className="h-3 w-20 bg-surface-variant/40 rounded-full" />
                    <div className="w-6 h-6 bg-surface-variant/40 rounded-full" />
                    <div className="h-3 w-16 bg-surface-variant/30 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center justify-center h-[calc(100vh-5rem)] pt-20">
            <div className="flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-error text-5xl">error</span>
              <p className="text-on-surface-variant text-sm">{tr.cityNotFound}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && current && (
          <div className="pt-24 px-4 lg:px-8 pb-32 lg:pb-12">

            {/* Hero + Stats + Favorites */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Hero + Stats — merged card */}
            <section className="lg:col-span-2 relative overflow-hidden rounded-[2rem] p-5 lg:p-10 bg-surface-container/40 backdrop-blur-2xl border border-white/5">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 blur-[100px] rounded-full pointer-events-none" />

              {/* Action buttons — ville domicile + favori */}
              <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
                {/* Home toggle */}
                {(() => {
                  const isHome = homeCity != null && sameLocation(homeCity, current);
                  return (
                    <button
                      onClick={handleToggleHome}
                      className="transition-colors"
                      title={isHome ? "Retirer la ville domicile" : "Définir comme ville domicile"}
                    >
                      <span
                        className={`material-symbols-outlined text-2xl transition-colors ${isHome ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}
                        style={isHome ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        home
                      </span>
                    </button>
                  );
                })()}
                {/* Favorite toggle */}
                {(() => {
                  const isFav = favorites.some(f => sameLocation(f, current));
                  const handleToggle = async () => {
                    if (isFav) {
                      const existing = favorites.find(f => sameLocation(f, current));
                      setFavorites(prev => prev.filter(f => !sameLocation(f, current)));
                      if (user && existing?.id) {
                        const token = await getToken().catch(() => null);
                        if (token) apiDeleteFavorite(token, existing.id).catch(() => {});
                      }
                    } else {
                      if (!user) { openLogin(); return; }
                      const colors = FAV_COLORS[favorites.length % FAV_COLORS.length];
                      const token = await getToken().catch(() => null);
                      if (token) {
                        apiAddFavorite(token, { city_name: current.city, lat: current.lat, lon: current.lon })
                          .then((fav) => {
                            setFavorites(prev => [...prev, { id: fav.id, city: fav.city_name, lat: fav.lat, lon: fav.lon, ...colors }]);
                          })
                          .catch(() => {
                            setFavorites(prev => [...prev, { city: current.city, lat: current.lat, lon: current.lon, ...colors }]);
                          });
                      }
                    }
                  };
                  return (
                    <button
                      onClick={handleToggle}
                      className="transition-colors"
                      title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <span className={`material-symbols-outlined text-2xl transition-colors ${isFav ? "text-on-surface-variant hover:text-error" : "text-on-surface-variant hover:text-white"}`}>
                        {isFav ? "do_not_disturb_on" : "add_circle"}
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* City + temp + stats */}
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
                {/* LEFT: location + temperature */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{current.city}, {current.country}</h2>
                  </div>
                  <p className="text-on-surface-variant text-sm capitalize mb-3">{dateStr}</p>
                  <div className="flex items-start">
                    <span className="text-[4rem] lg:text-[6rem] font-black leading-none tracking-tighter text-white">
                      {fmtTempVal(current.temp, units.temp)}
                    </span>
                    <span className="text-3xl lg:text-4xl font-medium mt-2 text-primary">°{units.temp}</span>
                  </div>
                </div>

                {/* RIGHT: condition + stats grid */}
                <div className="flex-1 flex flex-col gap-6 pt-1">
                  {/* Condition + UV */}
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: "2.5rem", color: condColor }}>{condIcon}</span>
                    <p className="text-2xl lg:text-3xl font-bold capitalize">{tr[condKey] ?? current.weather[0].description}</p>
                    {current.uv_index != null && (
                      <span className="ml-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        UV {Math.round(current.uv_index)} · {getUvLabel(current.uv_index, tr)}
                      </span>
                    )}
                  </div>

                  {/* Stats grid — 6 items */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-6">
                  {((): { icon: string; labelKey: string; value: string; unit: string }[] => {
                    const wind = fmtWind(current.wind_speed, units.wind);
                    const pres = fmtPressure(current.pressure, units.pressure);
                    const vis  = fmtVis(current.visibility, units.vis);
                    const aqi  = current.aqi;
                    return [
                      { icon: "thermostat",   labelKey: "feelsLike",  value: `${fmtTempVal(current.feels_like, units.temp)}`,  unit: `°${units.temp}` },
                      { icon: "air",          labelKey: "wind",       value: wind.value,                                       unit: wind.label       },
                      { icon: "humidity_mid", labelKey: "humidity",   value: `${current.humidity}`,                            unit: "%"              },
                      { icon: "compress",     labelKey: "pressure",   value: pres.value,                                       unit: pres.label       },
                      { icon: "aq",           labelKey: "airQuality", value: aqi != null ? getAqiLabel(aqi, tr) : "—",         unit: ""               },
                      { icon: "visibility",   labelKey: "visibility", value: vis.value,                                        unit: vis.label        },
                    ];
                  })().map((stat) => (
                    <div key={stat.labelKey} className="flex flex-col gap-2">
                      <span className="material-symbols-outlined text-primary text-2xl p-2 bg-primary/10 rounded-xl w-fit">{stat.icon}</span>
                      <div>
                        <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{tr[stat.labelKey]}</p>
                        <p className="text-base font-bold leading-tight">
                          {stat.value}{stat.unit && <span className="text-xs font-normal text-on-surface-variant"> {stat.unit}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                </div>{/* end RIGHT flex-col */}
              </div>
            </section>

            {/* Favorites — right column */}
            <section className="flex flex-col gap-4">

              {/* Current location button */}
              <button
                onClick={requestLocation}
                disabled={locStatus === "loading"}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-2xl transition-all active:scale-95 disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-primary text-xl ${locStatus === "loading" ? "animate-pulse" : ""}`}>
                  my_location
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-primary leading-tight">
                    {locStatus === "loading" ? tr.locating : locStatus === "denied" ? tr.locationDenied : tr.currentCity}
                  </p>
                  {locStatus === "ok" && locCity && (
                    <p className="text-xs text-on-surface-variant leading-tight">{locCity}</p>
                  )}
                </div>
              </button>

              <div className="px-1">
                <h3 className="text-lg font-bold">{tr.favoriteCities}</h3>
              </div>

              {favorites.map((fav, i) => {
                const d = favData[i];
                const fIcon  = d ? getWeatherIcon(d.weather[0].icon) : "cloud";
                const fColor = d ? getWeatherColor(d.weather[0].icon) : "#90A4AE";
                const fCond = d ? (tr[owmConditionKey(d.weather[0].main, d.weather[0].description)] ?? d.weather[0].description) : "—";
                return (
                  <div
                    key={`${fav.lat},${fav.lon}`}
                    draggable
                    onDragStart={(e) => {
                      // dataTransfer obligatoire pour que le drag démarre réellement (Firefox notamment)
                      e.dataTransfer.setData("text/plain", String(i));
                      e.dataTransfer.effectAllowed = "move";
                      setDraggedFav(i);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverFav(i);
                    }}
                    onDrop={(e) => { e.preventDefault(); handleDropFav(i); }}
                    onDragEnd={() => { setDraggedFav(null); setDragOverFav(null); }}
                    onClick={() => searchByCoords(fav.lat, fav.lon, fav.city)}
                    className={`bg-surface-container/40 backdrop-blur-2xl border rounded-3xl p-5 flex items-center justify-between gap-3 transition-all cursor-grab active:cursor-grabbing select-none ${
                      draggedFav === i
                        ? "opacity-40 border-white/5"
                        : dragOverFav === i
                        ? "border-primary/50 ring-2 ring-primary/40"
                        : "border-white/5 hover:scale-[1.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-on-surface-variant/40 text-xl flex-shrink-0">drag_indicator</span>
                      <div className={`w-12 h-12 rounded-2xl ${fav.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <span className="material-symbols-outlined" style={{ color: fColor }}>{fIcon}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold truncate">{fav.city}</h4>
                        <p className="text-xs text-on-surface-variant capitalize truncate">{fCond}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black flex-shrink-0">{d ? `${fmtTempVal(d.temp, units.temp)}°` : "—"}</span>
                  </div>
                );
              })}

              {/* Soleil — lever / coucher */}
              <SunArc sunrise={current.sunrise} sunset={current.sunset} timeFmt={units.time} tr={tr} />
            </section>

            </div>{/* end Hero+Favorites grid */}

            {/* Hourly forecast */}
            {hourly.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold tracking-tight">{tr.hourlyForecast}</h3>
                  <button className="text-sm text-primary font-medium hover:underline">{tr.seeDetailedMap}</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {hourly.map((h, i) => {
                    const hIcon  = getWeatherIcon(h.weather[0].icon);
                    const hColor = getWeatherColor(h.weather[0].icon);
                    return (
                      <div
                        key={h.dt}
                        className={["flex-shrink-0 w-28 lg:w-32 bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 lg:p-5 flex flex-col items-center gap-3 transition-all",
                          i === 0 ? "border-b-2 border-b-primary" : "hover:bg-surface-container-highest/40",
                        ].join(" ")}
                      >
                        <span className={`text-xs font-bold uppercase ${i === 0 ? "text-primary" : "text-on-surface-variant"}`}>
                          {i === 0 ? tr.now : formatHour(h.dt, units.time)}
                        </span>
                        <span className="material-symbols-outlined text-2xl" style={{ color: hColor }}>{hIcon}</span>
                        <span className="text-lg font-bold">{fmtTempVal(h.temp, units.temp)}°</span>
                      </div>
                    );
                  })}
                </div>

                {/* Temperature curve */}
                <TempCurve
                  temps={hourly.map(h => fmtTempVal(h.temp, units.temp))}
                  hours={hourly.map((h, i) => i === 0 ? (tr.now ?? "Now") : formatHour(h.dt, units.time))}
                  nowLabel={tr.now ?? "Now"}
                />

                {/* Precipitation graph */}
                {(() => {
                  const maxRain = Math.max(...hourly.map(h => h.rain ?? 0), 0.1);
                  return (
                    <div className="mt-4 bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-blue-400 text-base">water_drop</span>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{tr.precipitation ?? "Précipitations"}</p>
                      </div>
                      <div className="flex items-end gap-1 h-16">
                        {hourly.map((h, i) => {
                          const mm = h.rain ?? 0;
                          const heightPct = (mm / maxRain) * 100;
                          const { value, label } = fmtPrecip(mm, units.precip);
                          return (
                            <div key={h.dt} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
                                <div
                                  className="w-full rounded-t-sm transition-all"
                                  style={{
                                    height: `${Math.max(heightPct, mm > 0 ? 8 : 2)}%`,
                                    background: mm > 0 ? "rgb(96 165 250)" : "rgba(96,165,250,0.15)",
                                  }}
                                />
                              </div>
                              {mm > 0 && (
                                <span className="text-[9px] text-blue-400 font-medium">{value}{label}</span>
                              )}
                              {mm === 0 && <span className="text-[9px] text-on-surface-variant/40">—</span>}
                              <span className={`text-[9px] ${i === 0 ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                                {i === 0 ? tr.now : formatHour(h.dt, units.time)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* 7-day forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Daily forecast */}
              {allItems.length > 0 && (
                <section className="lg:col-span-3 bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 lg:p-8 h-fit">
                  <h3 className="text-xl font-bold mb-6">{tr.dailyForecast}</h3>
                  <div className="space-y-4">
                    {allItems.map((f, i) => {
                      const fIcon      = getWeatherIcon(f.weather[0].icon);
                      const fColor     = getWeatherColor(f.weather[0].icon);
                      const fCondKey   = owmConditionKey(f.weather[0].main, f.weather[0].description);
                      const dayLabel   = i === 0
                        ? tr.today
                        : new Date(f.dt * 1000).toLocaleDateString(LOCALE_MAP[lang], { weekday: "long" });
                      const barLeft    = `${((f.temp_min - overallMin) / range) * 100}%`;
                      const barRight   = `${((overallMax - f.temp_max) / range) * 100}%`;

                      return (
                        <div key={f.dt} className="flex items-center justify-between py-2 group">
                          <span className="w-24 font-medium group-hover:text-primary transition-colors text-sm capitalize">{dayLabel}</span>
                          <div className="flex items-center gap-2 w-36 min-w-0">
                            <span className="material-symbols-outlined flex-shrink-0" style={{ color: fColor }}>{fIcon}</span>
                            <span className="text-sm text-on-surface-variant truncate">{tr[fCondKey] ?? f.weather[0].description}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                            <span className="text-xs text-on-surface-variant w-8 text-right">{fmtTempVal(f.temp_min, units.temp)}°</span>
                            <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden relative">
                              <div
                                className="absolute inset-y-0 rounded-full"
                                style={{
                                  left: barLeft,
                                  right: barRight,
                                  background: `linear-gradient(to right, #60a5fa, #fbbf24)`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold w-8">{fmtTempVal(f.temp_max, units.temp)}°</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Auth modal (login / register) */}
      {authModal && (() => {
        const t = TRANSLATIONS[lang];
        const isRegister = authModal === "register";
        const baseInput = "w-full bg-surface-container-high rounded-xl px-4 py-3 pr-11 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 transition-all border";

        // Password rule checks
        const hasMin     = authPassword.length >= 8;
        const hasUpper   = /[A-Z]/.test(authPassword);
        const hasNum     = /[0-9]/.test(authPassword);
        const hasSpecial = /[^a-zA-Z0-9]/.test(authPassword);
        const pwdOk      = hasMin && hasUpper && hasNum && hasSpecial;
        const confirmOk  = authConfirm.length > 0 && authConfirm === authPassword;
        const confirmBad = authConfirm.length > 0 && authConfirm !== authPassword;

        const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
          <span className={`flex items-center gap-1 text-[11px] transition-colors ${authPassword.length === 0 ? "text-on-surface-variant/50" : ok ? "text-green-400" : "text-red-400"}`}>
            <span className="material-symbols-outlined text-[13px]">{ok ? "check_circle" : "cancel"}</span>
            {label}
          </span>
        );

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-surface-container-lowest border border-white/10 rounded-3xl p-8 shadow-2xl">

              <h2 className="text-xl font-bold mb-1">{isRegister ? t.authRegisterTitle : t.authLoginTitle}</h2>
              <p className="text-xs text-on-surface-variant mb-6">
                {isRegister ? (
                  <>{t.authAlreadyAccount}{" "}<button onClick={openLogin} className="text-primary hover:underline font-semibold">{t.authSignIn}</button></>
                ) : (
                  <>{t.authNoAccount}{" "}<button onClick={openRegister} className="text-primary hover:underline font-semibold">{t.authSignUp}</button></>
                )}
              </p>

              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">{t.authEmailLabel}</label>
                  <input
                    type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="vous@example.com"
                    className="bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Username (register only) */}
                {isRegister && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">{t.authUsernameLabel}</label>
                    <input
                      type="text" required minLength={2} maxLength={50} value={authUsername} onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder={t.authUsernamePlaceholder}
                      className="bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                )}

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">{t.authPasswordLabel}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"} required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder={isRegister ? t.authPasswordPlaceholder : "••••••••"}
                      className={`${baseInput} ${isRegister ? (authPassword.length === 0 ? "border-white/10 focus:ring-primary/30" : pwdOk ? "border-green-500/60 focus:ring-green-500/30" : "border-red-500/60 focus:ring-red-500/30") : "border-white/10 focus:ring-primary/30"}`}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  {/* Checklist */}
                  {isRegister && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
                      <Rule ok={hasMin}     label={t.pwdMin8} />
                      <Rule ok={hasUpper}   label={t.pwdUppercase} />
                      <Rule ok={hasNum}     label={t.pwdNumber} />
                      <Rule ok={hasSpecial} label={t.pwdSpecial} />
                    </div>
                  )}
                </div>

                {/* Confirm password (register only) */}
                {isRegister && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">{t.authConfirmLabel}</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"} required value={authConfirm} onChange={(e) => setAuthConfirm(e.target.value)}
                        placeholder={t.authConfirmPlaceholder}
                        className={`${baseInput} ${confirmOk ? "border-green-500/60 focus:ring-green-500/30" : confirmBad ? "border-red-500/60 focus:ring-red-500/30" : "border-white/10 focus:ring-primary/30"}`}
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined text-lg">{showConfirm ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                    {authConfirm.length > 0 && (
                      <span className={`flex items-center gap-1 text-[11px] mt-0.5 transition-colors ${confirmOk ? "text-green-400" : "text-red-400"}`}>
                        <span className="material-symbols-outlined text-[13px]">{confirmOk ? "check_circle" : "cancel"}</span>
                        {confirmOk ? t.pwdMatch : t.errPasswordNoMatch}
                      </span>
                    )}
                  </div>
                )}

                {authError && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2.5">
                    <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0">error</span>
                    {authError}
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={closeAuth}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors">
                    {t.authCancel}
                  </button>
                  <button type="submit" disabled={authLoading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50">
                    {authLoading ? "…" : isRegister ? t.authRegisterBtn : t.authLoginBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
