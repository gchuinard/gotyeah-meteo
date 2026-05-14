/**
 * @file auth.ts
 * @description Fonctions fetch vers les endpoints d'authentification du backend (/auth/*).
 *
 * @dependencies
 * - NEXT_PUBLIC_API_URL : URL de base du backend, injectée à la compilation par Next.js
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserOut {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
}

/**
 * Extrait le corps JSON d'une réponse HTTP et lève une erreur lisible si la requête a échoué.
 *
 * @param res - Réponse fetch brute.
 * @returns Corps JSON parsé.
 * @throws {Error} Message d'erreur issu du champ "detail" de l'API ou du code HTTP.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Inscrit un nouvel utilisateur.
 *
 * @param email - Adresse e-mail.
 * @param password - Mot de passe (min 8 caractères côté backend).
 * @returns Paire de tokens (access + refresh).
 * @throws {Error} Si l'email est déjà utilisé ou si la requête échoue.
 */
export async function apiRegister(email: string, password: string, username: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });
  return handleResponse<TokenResponse>(res);
}

/**
 * Connecte un utilisateur existant.
 *
 * @param email - Adresse e-mail.
 * @param password - Mot de passe.
 * @returns Paire de tokens (access + refresh).
 * @throws {Error} Si les identifiants sont incorrects.
 */
export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<TokenResponse>(res);
}

/**
 * Échange un refresh token valide contre un nouveau couple de tokens (rotation côté serveur).
 *
 * @param refreshToken - Refresh token brut stocké côté client.
 * @returns Nouveau couple access + refresh token.
 * @throws {Error} Si le refresh token est invalide ou expiré.
 */
export async function apiRefresh(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return handleResponse<TokenResponse>(res);
}

/**
 * Révoque le refresh token côté serveur (déconnexion).
 *
 * @param refreshToken - Refresh token à invalider.
 * @throws {Error} Si la révocation échoue côté serveur.
 */
export async function apiLogout(refreshToken: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Logout failed: HTTP ${res.status}`);
}

/**
 * Supprime le compte de l'utilisateur connecté (irréversible).
 *
 * @param accessToken - JWT d'accès valide.
 * @throws {Error} Si la suppression échoue côté serveur.
 */
export async function apiDeleteAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Account deletion failed: HTTP ${res.status}`);
}

/**
 * Retourne les informations du compte associé à l'access token.
 *
 * @param accessToken - JWT d'accès valide.
 * @returns Profil utilisateur (id, email, created_at).
 * @throws {Error} Si le token est invalide ou expiré.
 */
export async function apiMe(accessToken: string): Promise<UserOut> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return handleResponse<UserOut>(res);
}
