/**
 * @file useWeather.ts
 * @description Hook React pour charger et mettre à jour les données météo (géocodage, météo courante, prévisions).
 *
 * @dependencies
 * - lib/api : fonctions fetch vers les endpoints /weather du backend
 */

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

/**
 * useWeather
 *
 * Gère le chargement des données météo pour une ville ou des coordonnées GPS.
 * Expose deux méthodes de recherche : par nom de ville (avec géocodage) ou par coordonnées directes.
 *
 * @returns État météo courant + fonctions search et searchByCoords.
 */
export function useWeather() {
  const [state, setState] = useState<WeatherState>({
    location: null,
    current: null,
    forecast: null,
    loading: false,
    error: null,
  });

  /**
   * Charge la météo pour une ville en passant d'abord par le géocodage.
   *
   * @param city - Nom de la ville à rechercher.
   */
  const search = useCallback(async (city: string) => {
    console.log("[useWeather] search →", city);
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const locations: GeoLocation[] = await fetchGeocode(city);
      if (!locations.length) throw new Error("City not found");

      const location = locations[0];
      console.log("[useWeather] geocode OK →", location);
      const [current, forecast] = await Promise.all([
        fetchCurrentWeather(location.lat, location.lon),
        fetchForecast(location.lat, location.lon),
      ]);

      console.log("[useWeather] weather loaded ✅");
      setState({ location, current, forecast, loading: false, error: null });
    } catch (err) {
      console.error("[useWeather] search failed ❌", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  /**
   * Charge la météo directement depuis des coordonnées GPS, sans géocodage.
   * Utilisé pour les favoris dont on connaît déjà la position.
   *
   * @param lat - Latitude (WGS84).
   * @param lon - Longitude (WGS84).
   * @param name - Nom de la ville à afficher (optionnel, fallback sur current.city).
   */
  const searchByCoords = useCallback(async (lat: number, lon: number, name?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [current, forecast] = await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon),
      ]);

      setState({
        location: { lat, lon, name: name ?? current.city, country: current.country },
        current,
        forecast,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  return { ...state, search, searchByCoords };
}
