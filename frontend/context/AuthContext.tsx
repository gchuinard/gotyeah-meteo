/**
 * @file AuthContext.tsx
 * @description Contexte React d'authentification — gestion des tokens JWT, session persistante via localStorage.
 *
 * @dependencies
 * - lib/api/auth : appels fetch vers les endpoints /auth du backend
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRefresh,
  apiRegister,
  UserOut,
} from "@/lib/api/auth";

interface AuthState {
  user: UserOut | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Retourne un access token valide, en le rafraîchissant automatiquement si nécessaire.
   * @throws {Error} Si l'utilisateur n'est pas authentifié.
   */
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Clés localStorage — préfixe "wn_" pour éviter les collisions avec d'autres apps
const LS_ACCESS  = "wn_access_token";
const LS_REFRESH = "wn_refresh_token";

/**
 * AuthProvider
 *
 * Fournit le contexte d'authentification à l'arbre React.
 * Au montage, restaure la session depuis localStorage et valide le token auprès du backend.
 *
 * @param props.children - Arbre React à envelopper.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
  });

  // Restauration de session au chargement de la page
  useEffect(() => {
    const access  = localStorage.getItem(LS_ACCESS);
    const refresh = localStorage.getItem(LS_REFRESH);
    if (!access || !refresh) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    apiMe(access)
      .then((user) => {
        setState({ user, accessToken: access, refreshToken: refresh, loading: false });
      })
      .catch(async () => {
        // L'access token est peut-être expiré — on tente un refresh silencieux
        try {
          const { access_token } = await apiRefresh(refresh);
          localStorage.setItem(LS_ACCESS, access_token);
          const user = await apiMe(access_token);
          setState({ user, accessToken: access_token, refreshToken: refresh, loading: false });
        } catch {
          // Refresh invalide — on efface la session pour forcer une reconnexion
          localStorage.removeItem(LS_ACCESS);
          localStorage.removeItem(LS_REFRESH);
          setState({ user: null, accessToken: null, refreshToken: null, loading: false });
        }
      });
  }, []);

  /**
   * Connecte un utilisateur et persiste ses tokens dans localStorage.
   *
   * @param email - Adresse e-mail.
   * @param password - Mot de passe.
   * @throws {Error} Si les identifiants sont incorrects.
   */
  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiLogin(email, password);
    const user   = await apiMe(tokens.access_token);
    localStorage.setItem(LS_ACCESS,  tokens.access_token);
    localStorage.setItem(LS_REFRESH, tokens.refresh_token);
    setState({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, loading: false });
  }, []);

  /**
   * Inscrit un nouvel utilisateur et ouvre sa session immédiatement.
   *
   * @param email - Adresse e-mail.
   * @param password - Mot de passe (min 8 caractères).
   * @throws {Error} Si l'email est déjà utilisé.
   */
  const register = useCallback(async (email: string, password: string) => {
    const tokens = await apiRegister(email, password);
    const user   = await apiMe(tokens.access_token);
    localStorage.setItem(LS_ACCESS,  tokens.access_token);
    localStorage.setItem(LS_REFRESH, tokens.refresh_token);
    setState({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, loading: false });
  }, []);

  /**
   * Révoque le refresh token côté serveur et efface la session locale.
   */
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(LS_REFRESH);
    if (refresh) await apiLogout(refresh).catch(() => {});
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    setState({ user: null, accessToken: null, refreshToken: null, loading: false });
  }, []);

  /**
   * Retourne l'access token courant ou en obtient un nouveau via refresh.
   *
   * @returns Access token JWT valide.
   * @throws {Error} Si aucune session active n'est disponible.
   */
  const getToken = useCallback(async (): Promise<string> => {
    const access  = state.accessToken;
    const refresh = state.refreshToken ?? localStorage.getItem(LS_REFRESH);
    if (!refresh) throw new Error("Not authenticated");
    if (access) return access;
    const { access_token } = await apiRefresh(refresh);
    localStorage.setItem(LS_ACCESS, access_token);
    setState((s) => ({ ...s, accessToken: access_token }));
    return access_token;
  }, [state.accessToken, state.refreshToken]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth
 *
 * Hook pour accéder au contexte d'authentification depuis n'importe quel composant client.
 *
 * @returns Valeur complète du AuthContext.
 * @throws {Error} Si utilisé en dehors d'un AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
