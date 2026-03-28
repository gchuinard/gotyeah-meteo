"use client";

import React, { useState, useEffect } from "react";
import { SideNav } from "@/components/layout/SideNav";
import { TRANSLATIONS, type Lang } from "@/lib/translations";
import { useWeather } from "@/hooks/useWeather";
import { fetchCurrentWeather } from "@/lib/api";
import { getWeatherIcon, getWeatherColor } from "@/lib/weatherIcons";
import { SearchAutocomplete } from "@/components/weather/SearchAutocomplete";
import { DEFAULT_UNITS, fmtTempVal, fmtWind, fmtPressure, fmtDate, type Units } from "@/lib/units";
import type { CurrentWeather } from "@/types/weather";
import { useAuth } from "@/context/AuthContext";
import { apiGetFavorites, apiAddFavorite, apiDeleteFavorite } from "@/lib/api/user";

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

export default function HomePage() {
  const { user, accessToken, getToken, login, register } = useAuth();
  const [lang, setLang]           = useState<Lang>("FR");
  const [langOpen, setLangOpen]   = useState(false);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "denied" | "ok">("idle");
  const [locCity, setLocCity]     = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>(DEFAULT_FAVORITES);
  const [favData, setFavData]     = useState<(CurrentWeather | null)[]>([null, null]);
  const [units, setUnits]         = useState<Units>(DEFAULT_UNITS);

  // Auth modals
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
  const [authEmail, setAuthEmail]       = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm]   = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError]       = useState<string | null>(null);
  const [authLoading, setAuthLoading]   = useState(false);

  function openLogin()    { setAuthModal("login");    setAuthEmail(""); setAuthPassword(""); setAuthConfirm(""); setAuthUsername(""); setAuthError(null); }
  function openRegister() { setAuthModal("register"); setAuthEmail(""); setAuthPassword(""); setAuthConfirm(""); setAuthUsername(""); setAuthError(null); }
  function closeAuth()    { setAuthModal(null); }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (authModal === "register") {
      if (authPassword !== authConfirm) { setAuthError("Les mots de passe ne correspondent pas"); return; }
      if (authPassword.length < 8)      { setAuthError("Minimum 8 caractères"); return; }
    }
    setAuthLoading(true);
    try {
      if (authModal === "login")    await login(authEmail, authPassword);
      if (authModal === "register") await register(authEmail, authPassword, authUsername);
      closeAuth();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAuthLoading(false);
    }
  }

  const { current, forecast, loading, error, search, searchByCoords } = useWeather();
  const tr = TRANSLATIONS[lang];

  // Load favorites from API when authenticated
  useEffect(() => {
    if (!user || !accessToken) {
      setFavorites(DEFAULT_FAVORITES);
      return;
    }
    apiGetFavorites(accessToken).then((apiFavs) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    Promise.all(
      favorites.map(({ lat, lon }) => fetchCurrentWeather(lat, lon).catch(() => null))
    ).then(setFavData);
  }, [favorites]);

  useEffect(() => {
    console.log("[WeatherNow] Geolocation effect fired");
    if (!navigator.geolocation) {
      console.log("[WeatherNow] No geolocation — searching Paris");
      search("Paris");
      return;
    }

    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        console.log("[WeatherNow] Geolocation OK:", pos.coords.latitude, pos.coords.longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Paris";
          console.log("[WeatherNow] Reverse geocode →", city);
          setLocCity(city);
          setLocStatus("ok");
          search(city);
        } catch (err) {
          console.warn("[WeatherNow] Reverse geocode failed:", err, "— fallback to Paris");
          setLocStatus("idle");
          search("Paris");
        }
      },
      (err) => {
        console.warn("[WeatherNow] Geolocation denied/error:", err.message, "— fallback to Paris");
        setLocStatus("denied");
        search("Paris");
      },
      { timeout: 8000 }
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
          setLocCity("Paris");
          setLocStatus("ok");
        }
      },
      () => setLocStatus("denied"),
      { timeout: 8000 }
    );
  }

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
      <SideNav units={units} onUnitsChange={setUnits} onOpenLogin={openLogin} onOpenRegister={openRegister} />

      <div className="lg:ml-64 min-h-screen relative overflow-x-hidden">

        {/* Top bar */}
        <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-20 z-40 flex justify-between items-center px-6 lg:px-8 bg-background/80 backdrop-blur-xl">
          <div className="lg:hidden text-xl font-black tracking-tighter text-primary">WeatherNow</div>

          <div className="hidden lg:flex flex-1 max-w-xl">
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

            {user && (
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary select-none">
                {user.email[0].toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-[calc(100vh-5rem)] pt-20">
            <div className="flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-primary text-5xl animate-pulse">cloud</span>
              <p className="text-on-surface-variant text-sm">{tr.loading}</p>
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
            <section className="lg:col-span-2 relative overflow-hidden rounded-[2rem] p-8 lg:p-10 bg-surface-container/40 backdrop-blur-2xl border border-white/5">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 blur-[100px] rounded-full pointer-events-none" />

              {/* Favorite toggle button */}
              {(() => {
                const isFav = favorites.some(f => f.city === current.city);
                const handleToggle = async () => {
                  if (isFav) {
                    const existing = favorites.find(f => f.city === current.city);
                    setFavorites(prev => prev.filter(f => f.city !== current.city));
                    if (user && existing?.id) {
                      const token = await getToken().catch(() => null);
                      if (token) apiDeleteFavorite(token, existing.id).catch(() => {});
                    }
                  } else {
                    const colors = FAV_COLORS[favorites.length % FAV_COLORS.length];
                    if (user) {
                      const token = await getToken().catch(() => null);
                      if (token) {
                        apiAddFavorite(token, { city_name: current.city, lat: current.lat, lon: current.lon })
                          .then((fav) => {
                            setFavorites(prev => [...prev, { id: fav.id, city: fav.city_name, lat: fav.lat, lon: fav.lon, ...colors }]);
                          })
                          .catch(() => {
                            setFavorites(prev => [...prev, { city: current.city, lat: current.lat, lon: current.lon, ...colors }]);
                          });
                        return;
                      }
                    }
                    setFavorites(prev => [...prev, { city: current.city, lat: current.lat, lon: current.lon, ...colors }]);
                  }
                };
                return (
                  <button
                    onClick={handleToggle}
                    className="absolute top-6 right-6 z-20 transition-colors"
                    title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <span className={`material-symbols-outlined text-2xl transition-colors ${isFav ? "text-on-surface-variant hover:text-error" : "text-on-surface-variant hover:text-white"}`}>
                      {isFav ? "do_not_disturb_on" : "add_circle"}
                    </span>
                  </button>
                );
              })()}

              {/* City + temp + stats */}
              <div className="relative z-10 flex items-start gap-8">
                {/* LEFT: location + temperature */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{current.city}, {current.country}</h2>
                  </div>
                  <p className="text-on-surface-variant text-sm capitalize mb-3">{dateStr}</p>
                  <div className="flex items-start">
                    <span className="text-[6rem] lg:text-[9rem] font-black leading-none tracking-tighter text-white">
                      {fmtTempVal(current.temp, units.temp)}
                    </span>
                    <span className="text-4xl lg:text-5xl font-medium mt-3 text-primary">°{units.temp}</span>
                  </div>
                </div>

                {/* RIGHT: condition + 3×2 stats grid */}
                <div className="flex-1 flex flex-col gap-6 pt-1">
                  {/* Big condition */}
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: "3rem", color: condColor }}>{condIcon}</span>
                    <p className="text-3xl lg:text-4xl font-bold capitalize">{tr[condKey] ?? current.weather[0].description}</p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                  {((): { icon: string; labelKey: string; value: string; unit: string }[] => {
                    const wind = fmtWind(current.wind_speed, units.wind);
                    const pres = fmtPressure(current.pressure, units.pressure);
                    const uvi  = current.uv_index;
                    const aqi  = current.aqi;
                    return [
                      { icon: "air",          labelKey: "wind",       value: wind.value,                                       unit: wind.label      },
                      { icon: "humidity_mid", labelKey: "humidity",   value: `${current.humidity}`,                            unit: "%"             },
                      { icon: "compress",     labelKey: "pressure",   value: pres.value,                                       unit: pres.label      },
                      { icon: "thermostat",   labelKey: "feelsLike",  value: `${fmtTempVal(current.feels_like, units.temp)}`,  unit: `°${units.temp}` },
                      { icon: "wb_sunny",     labelKey: "uvIndex",    value: uvi != null ? `${Math.round(uvi)} · ${getUvLabel(uvi, tr)}` : "—", unit: "" },
                      { icon: "aq",           labelKey: "airQuality", value: aqi != null ? getAqiLabel(aqi, tr) : "—",         unit: ""              },
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

              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold">{tr.favoriteCities}</h3>
                <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-white transition-colors">add_circle</span>
              </div>

              {favorites.map((fav, i) => {
                const d = favData[i];
                const fIcon  = d ? getWeatherIcon(d.weather[0].icon) : "cloud";
                const fColor = d ? getWeatherColor(d.weather[0].icon) : "#90A4AE";
                const fCond = d ? (tr[owmConditionKey(d.weather[0].main, d.weather[0].description)] ?? d.weather[0].description) : "—";
                return (
                  <div key={fav.city} onClick={() => searchByCoords(fav.lat, fav.lon, fav.city)} className="bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-5 flex items-center justify-between hover:scale-[1.02] transition-transform cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${fav.bgColor} flex items-center justify-center`}>
                        <span className="material-symbols-outlined" style={{ color: fColor }}>{fIcon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold">{fav.city}</h4>
                        <p className="text-xs text-on-surface-variant capitalize">{fCond}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black">{d ? `${fmtTempVal(d.temp, units.temp)}°` : "—"}</span>
                  </div>
                );
              })}
            </section>

            </div>{/* end Hero+Favorites grid */}

            {/* Hourly forecast */}
            {hourly.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold tracking-tight">{tr.hourlyForecast}</h3>
                    <button
                      onClick={() => setUnits((u) => ({ ...u, time: u.time === "24h" ? "12h" : "24h" }))}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-surface-container/60 text-xs font-bold transition-colors hover:bg-surface-container-highest/60"
                    >
                      <span className={units.time === "12h" ? "text-primary" : "text-on-surface-variant"}>AM/PM</span>
                      <span className="text-outline-variant">|</span>
                      <span className={units.time === "24h" ? "text-primary" : "text-on-surface-variant"}>24h</span>
                    </button>
                  </div>
                  <button className="text-sm text-primary font-medium hover:underline">{tr.seeDetailedMap}</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
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
              </section>
            )}

            {/* 7-day forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Daily forecast */}
              {allItems.length > 0 && (
                <section className="lg:col-span-3 bg-surface-container/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 lg:p-8 h-fit">
                  <h3 className="text-xl font-bold mb-6">{tr.sevenDayForecast}</h3>
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
                          <div className="flex items-center gap-3 w-36">
                            <span className="material-symbols-outlined" style={{ color: fColor }}>{fIcon}</span>
                            <span className="text-sm text-on-surface-variant">{tr[fCondKey] ?? f.weather[0].description}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-1 max-w-[180px]">
                            <span className="text-xs text-on-surface-variant w-8">{fmtTempVal(f.temp_min, units.temp)}°</span>
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden relative">
                              <div className="absolute inset-y-0 bg-gradient-to-r from-primary to-tertiary rounded-full"
                                style={{ left: barLeft, right: barRight }} />
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
      {authModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-container-lowest border border-white/10 rounded-3xl p-8 shadow-2xl">

            <h2 className="text-xl font-bold mb-1">
              {authModal === "login" ? "Connexion" : "Inscription"}
            </h2>
            <p className="text-xs text-on-surface-variant mb-6">
              {authModal === "login" ? (
                <>Pas encore de compte ?{" "}
                  <button onClick={openRegister} className="text-primary hover:underline font-semibold">S&apos;inscrire</button>
                </>
              ) : (
                <>Déjà un compte ?{" "}
                  <button onClick={openLogin} className="text-primary hover:underline font-semibold">Se connecter</button>
                </>
              )}
            </p>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="vous@example.com"
                  className="bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {authModal === "register" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Pseudo</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={50}
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Votre pseudo"
                    className="bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              )}

              {(() => {
                const pwdInvalid = authModal === "register" && authPassword.length > 0 && authPassword.length < 8;
                const confirmInvalid = authModal === "register" && authConfirm.length > 0 && authConfirm !== authPassword;
                const baseInput = "bg-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 transition-all border";
                return (
                  <>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Mot de passe</label>
                        {pwdInvalid && <span className="text-[10px] text-red-400 font-medium">8 caractères minimum</span>}
                      </div>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder={authModal === "register" ? "8 caractères minimum" : "••••••••"}
                        className={`${baseInput} ${pwdInvalid ? "border-red-500/60 focus:ring-red-500/30" : authPassword.length >= 8 ? "border-green-500/60 focus:ring-green-500/30" : "border-white/10 focus:ring-primary/30"}`}
                      />
                    </div>

                    {authModal === "register" && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Confirmer</label>
                          {confirmInvalid && <span className="text-[10px] text-red-400 font-medium">Ne correspond pas</span>}
                        </div>
                        <input
                          type="password"
                          required
                          value={authConfirm}
                          onChange={(e) => setAuthConfirm(e.target.value)}
                          placeholder="••••••••"
                          className={`${baseInput} ${confirmInvalid ? "border-red-500/60 focus:ring-red-500/30" : authConfirm.length > 0 && authConfirm === authPassword ? "border-green-500/60 focus:ring-green-500/30" : "border-white/10 focus:ring-primary/30"}`}
                        />
                      </div>
                    )}
                  </>
                );
              })()}

              {authError && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2.5">{authError}</p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeAuth}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {authLoading ? "…" : authModal === "login" ? "Se connecter" : "Créer un compte"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
