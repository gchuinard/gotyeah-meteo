/**
 * @file units.ts
 * @description Types, valeurs par défaut et fonctions de conversion pour toutes les unités de mesure.
 *
 * @dependencies
 * - Aucune dépendance externe — fonctions pures uniquement
 */

export type TempUnit     = "C" | "F" | "K";
export type WindUnit     = "kmh" | "mph" | "ms" | "kt";
export type PressureUnit = "hPa" | "mbar" | "inHg" | "mmHg";
export type PrecipUnit   = "mm" | "in";
export type VisUnit      = "km" | "mi";
export type TimeFormat   = "24h" | "12h";
export type DateFormat   = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type DistUnit     = "km" | "mi";
export type HeightUnit   = "cm" | "in" | "ft";

/** Ensemble complet des préférences d'unités d'un utilisateur. */
export interface Units {
  temp:     TempUnit;
  wind:     WindUnit;
  pressure: PressureUnit;
  precip:   PrecipUnit;
  vis:      VisUnit;
  time:     TimeFormat;
  date:     DateFormat;
  distance: DistUnit;
  height:   HeightUnit;
}

/** Préférences par défaut alignées sur le système métrique international. */
export const DEFAULT_UNITS: Units = {
  temp:     "C",
  wind:     "kmh",
  pressure: "hPa",
  precip:   "mm",
  vis:      "km",
  time:     "24h",
  date:     "DD/MM/YYYY",
  distance: "km",
  height:   "cm",
};

/**
 * Convertit une température Celsius en valeur numérique dans l'unité cible.
 *
 * @param celsius - Température source en degrés Celsius.
 * @param unit - Unité cible.
 * @returns Valeur arrondie à l'entier le plus proche.
 */
export function fmtTempVal(celsius: number, unit: TempUnit): number {
  switch (unit) {
    case "F": return Math.round(celsius * 9 / 5 + 32);
    case "K": return Math.round(celsius + 273.15);
    default:  return Math.round(celsius);
  }
}

/**
 * Formate une température Celsius en chaîne avec symbole d'unité (ex. "23°C").
 *
 * @param celsius - Température source en degrés Celsius.
 * @param unit - Unité cible.
 * @returns Chaîne formatée prête à l'affichage.
 */
export function fmtTemp(celsius: number, unit: TempUnit): string {
  return `${fmtTempVal(celsius, unit)}°${unit}`;
}

/**
 * Convertit une vitesse de vent depuis m/s vers l'unité cible.
 *
 * @param ms - Vitesse en mètres par seconde (valeur brute OWM).
 * @param unit - Unité cible.
 * @returns Objet { value, label } prêt à l'affichage.
 */
export function fmtWind(ms: number, unit: WindUnit): { value: string; label: string } {
  switch (unit) {
    case "kmh": return { value: `${Math.round(ms * 3.6)}`,    label: "km/h" };
    case "mph": return { value: `${Math.round(ms * 2.237)}`,  label: "mph"  };
    case "ms":  return { value: `${Math.round(ms)}`,          label: "m/s"  };
    case "kt":  return { value: `${Math.round(ms * 1.944)}`,  label: "kt"   };
  }
}

/**
 * Convertit une pression atmosphérique depuis hPa vers l'unité cible.
 *
 * @param hpa - Pression en hectopascals (valeur brute OWM).
 * @param unit - Unité cible.
 * @returns Objet { value, label } prêt à l'affichage.
 */
export function fmtPressure(hpa: number, unit: PressureUnit): { value: string; label: string } {
  switch (unit) {
    case "hPa":  return { value: `${hpa}`,                           label: "hPa"  };
    case "mbar": return { value: `${hpa}`,                           label: "mbar" };
    case "inHg": return { value: `${(hpa * 0.02953).toFixed(2)}`,   label: "inHg" };
    case "mmHg": return { value: `${Math.round(hpa * 0.75006)}`,    label: "mmHg" };
  }
}

/**
 * Convertit une visibilité depuis des mètres vers l'unité cible.
 *
 * @param meters - Visibilité en mètres (valeur brute OWM).
 * @param unit - Unité cible.
 * @returns Objet { value, label } prêt à l'affichage.
 */
export function fmtVis(meters: number, unit: VisUnit): { value: string; label: string } {
  switch (unit) {
    case "km": return { value: `${(meters / 1000).toFixed(1)}`,    label: "km" };
    case "mi": return { value: `${(meters / 1609.34).toFixed(1)}`, label: "mi" };
  }
}

/**
 * Formate un timestamp Unix en chaîne de date selon le format choisi.
 *
 * @param ts - Timestamp Unix en secondes (valeur brute OWM).
 * @param format - Format de date cible.
 * @returns Chaîne de date formatée (ex. "25/03/2026").
 */
export function fmtDate(ts: number, format: DateFormat): string {
  const d    = new Date(ts * 1000);
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  switch (format) {
    case "DD/MM/YYYY": return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY": return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
  }
}
