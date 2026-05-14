/**
 * @file user.ts
 * @description Fonctions fetch vers les endpoints utilisateur du backend (/user/*) — préférences et favoris.
 *
 * @dependencies
 * - NEXT_PUBLIC_API_URL : URL de base du backend, injectée à la compilation par Next.js
 */

import type { UserOut } from "@/lib/api/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PreferencesOut {
  unit_system: string;
  theme: string;
  updated_at: string;
}

export interface FavoriteOut {
  id: string;
  city_name: string;
  lat: number;
  lon: number;
  position: number;
  created_at: string;
}

/**
 * Extrait le corps JSON d'une réponse HTTP et lève une erreur lisible si la requête a échoué.
 * Gère le cas 204 No Content (retourne undefined).
 *
 * @param res - Réponse fetch brute.
 * @returns Corps JSON parsé, ou undefined pour les réponses 204.
 * @throws {Error} Message d'erreur issu du champ "detail" de l'API ou du code HTTP.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Construit les headers JSON + Authorization pour les requêtes authentifiées. */
function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ---------------------------------------------------------------------------
// Préférences
// ---------------------------------------------------------------------------

/**
 * Récupère les préférences de l'utilisateur connecté.
 *
 * @param token - Access token JWT valide.
 * @returns Préférences actuelles (unit_system, theme).
 */
export async function apiGetPreferences(token: string): Promise<PreferencesOut> {
  const res = await fetch(`${API_URL}/user/preferences`, {
    headers: authHeaders(token),
  });
  return handleResponse<PreferencesOut>(res);
}

/**
 * Met à jour partiellement les préférences de l'utilisateur.
 *
 * @param token - Access token JWT valide.
 * @param data - Champs à modifier (unit_system et/ou theme).
 * @returns Préférences mises à jour.
 */
export async function apiUpdatePreferences(
  token: string,
  data: { unit_system?: string; theme?: string }
): Promise<PreferencesOut> {
  const res = await fetch(`${API_URL}/user/preferences`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<PreferencesOut>(res);
}

// ---------------------------------------------------------------------------
// Favoris
// ---------------------------------------------------------------------------

/**
 * Récupère la liste des villes favorites, ordonnées par position.
 *
 * @param token - Access token JWT valide.
 * @returns Liste des favoris.
 */
export async function apiGetFavorites(token: string): Promise<FavoriteOut[]> {
  const res = await fetch(`${API_URL}/user/favorites`, {
    headers: authHeaders(token),
  });
  return handleResponse<FavoriteOut[]>(res);
}

/**
 * Ajoute une ville en favori.
 *
 * @param token - Access token JWT valide.
 * @param data - Nom de la ville et coordonnées GPS.
 * @returns Favori créé avec son id et sa position.
 */
export async function apiAddFavorite(
  token: string,
  data: { city_name: string; lat: number; lon: number }
): Promise<FavoriteOut> {
  const res = await fetch(`${API_URL}/user/favorites`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<FavoriteOut>(res);
}

/**
 * Supprime un favori par son identifiant.
 *
 * @param token - Access token JWT valide.
 * @param id - UUID du favori à supprimer.
 */
export async function apiDeleteFavorite(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/user/favorites/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse<void>(res);
}

/**
 * Met à jour les positions de plusieurs favoris en une seule requête.
 *
 * @param token - Access token JWT valide.
 * @param items - Liste de paires { id, position }.
 */
export async function apiReorderFavorites(
  token: string,
  items: { id: string; position: number }[]
): Promise<void> {
  const res = await fetch(`${API_URL}/user/favorites/reorder`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ items }),
  });
  return handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

/**
 * Met à jour le pseudo de l'utilisateur connecté.
 *
 * @param token - Access token JWT valide.
 * @param username - Nouveau pseudo (2 à 50 caractères).
 * @returns Profil utilisateur mis à jour.
 * @throws {Error} Si le pseudo est déjà utilisé par un autre compte.
 */
export async function apiUpdateProfile(token: string, username: string): Promise<UserOut> {
  const res = await fetch(`${API_URL}/user/profile`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ username }),
  });
  return handleResponse<UserOut>(res);
}
