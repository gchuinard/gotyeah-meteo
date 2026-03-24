"use client";

import { useState, useCallback } from "react";
import { fetchGeocode, fetchCurrentWeather, fetchForecast } from "@/lib/api";
import type { CurrentWeather, Forecast, GeoLocation } from "@/types/weather";

interface WeatherState {
  location: GeoLocation | null;
  current: CurrentWeather | null;
  forecast: Forecast | null;
  loading: boolean;
  error: string | null;
}

export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    location: null,
    current: null,
    forecast: null,
    loading: false,
    error: null,
  });

  const search = useCallback(async (city: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const locations: GeoLocation[] = await fetchGeocode(city);
      if (!locations.length) throw new Error("City not found");

      const location = locations[0];
      const [current, forecast] = await Promise.all([
        fetchCurrentWeather(location.lat, location.lon),
        fetchForecast(location.lat, location.lon),
      ]);

      setState({ location, current, forecast, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  return { ...state, search };
}
