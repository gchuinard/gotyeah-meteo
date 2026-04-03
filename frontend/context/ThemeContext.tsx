/**
 * @file ThemeContext.tsx
 * @description Contexte React du thème visuel — prévisualisation immédiate et persistance locale (cache anti-flash).
 *
 * @dependencies
 * - lib/themes : données des thèmes (THEMES, Theme)
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
import { THEMES, type Theme } from "@/lib/themes";

// Clé localStorage — cache anti-flash du thème actif entre rechargements
const LS_THEME = "wn_theme";

interface ThemeContextValue {
  themeId: string;
  /**
   * Applique un thème visuellement et optionnellement le mémorise dans le cache localStorage.
   *
   * @param id - Identifiant du thème à appliquer.
   * @param persist - Si true, écrit dans localStorage (après confirmation ou chargement de session).
   */
  setTheme: (id: string, persist: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Injecte les variables CSS d'un thème sur l'élément racine du document.
 *
 * @param t - Objet thème contenant les tokens de couleur RGB.
 */
function applyThemeToDom(t: Theme): void {
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
  if (t.light) root.setAttribute("data-light", "true");
  else root.removeAttribute("data-light");
}

/**
 * ThemeProvider
 *
 * Fournit le contexte de thème à l'arbre React.
 * Au montage, synchronise l'état React avec le cache localStorage déjà appliqué
 * par le script anti-flash dans <head>.
 *
 * @param props.children - Arbre React à envelopper.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState("ocean");

  // Synchronise l'état React avec le thème appliqué par le script anti-flash
  useEffect(() => {
    const cached = localStorage.getItem(LS_THEME);
    if (cached && THEMES.some((t) => t.id === cached)) {
      setThemeId(cached);
      // Pas de re-application des CSS vars : le script anti-flash l'a déjà fait avant le premier rendu
    }
  }, []);

  const setTheme = useCallback((id: string, persist: boolean) => {
    const t = THEMES.find((t) => t.id === id) ?? THEMES[0];
    applyThemeToDom(t);
    setThemeId(t.id);
    if (persist) localStorage.setItem(LS_THEME, t.id);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme
 *
 * Hook pour accéder au contexte de thème depuis n'importe quel composant client.
 *
 * @returns Valeur du ThemeContext (themeId courant + fonction setTheme).
 * @throws {Error} Si utilisé en dehors d'un ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
