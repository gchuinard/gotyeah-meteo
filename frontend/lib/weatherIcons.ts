/**
 * @file weatherIcons.ts
 * @description Correspondance entre les codes icônes OWM et les icônes Material Symbols + couleurs associées.
 *
 * @dependencies
 * - Aucune dépendance externe — tables de correspondance statiques
 */

/** Correspondance code OWM → nom d'icône Material Symbols Outlined. */
const OWM_ICON_MAP: Record<string, string> = {
  "01d": "sunny",
  "01n": "nights_stay",
  "02d": "partly_cloudy_day",
  "02n": "partly_cloudy_night",
  "03d": "partly_cloudy_day",
  "03n": "partly_cloudy_night",
  "04d": "cloud",
  "04n": "cloud",
  "09d": "rainy",
  "09n": "rainy",
  "10d": "rainy",
  "10n": "rainy",
  "11d": "thunderstorm",
  "11n": "thunderstorm",
  "13d": "ac_unit",
  "13n": "ac_unit",
  "50d": "foggy",
  "50n": "foggy",
};

/**
 * Retourne le nom de l'icône Material Symbols correspondant à un code OWM.
 *
 * @param owmIconCode - Code icône OWM (ex. "01d", "10n").
 * @returns Nom de l'icône Material Symbols, "partly_cloudy_day" par défaut.
 */
export function getWeatherIcon(owmIconCode: string): string {
  return OWM_ICON_MAP[owmIconCode] ?? "partly_cloudy_day";
}

/**
 * Correspondance code OWM → couleur hex.
 * Les variantes jour/nuit partagent la même teinte ; la nuit est plus froide/atténuée.
 */
const WEATHER_COLORS: Record<string, string> = {
  // ☀️ Ciel dégagé
  "01d": "#FFA726", // orange-jaune chaud
  "01n": "#7986CB", // indigo doux nuit

  // 🌤 Quelques nuages
  "02d": "#FFB74D",
  "02n": "#5C6BC0",

  // ⛅ Nuages épars
  "03d": "#90A4AE",
  "03n": "#546E7A",

  // ☁️ Couvert
  "04d": "#78909C",
  "04n": "#455A64",

  // 🌧 Averses
  "09d": "#4FC3F7",
  "09n": "#0288D1",

  // 🌦 Pluie
  "10d": "#42A5F5",
  "10n": "#1565C0",

  // ⛈ Orage
  "11d": "#7E57C2",
  "11n": "#4527A0",

  // ❄️ Neige
  "13d": "#B3E5FC",
  "13n": "#80DEEA",

  // 🌫 Brouillard / brume
  "50d": "#B0BEC5",
  "50n": "#78909C",
};

/**
 * Retourne la couleur hex associée aux conditions météo d'un code OWM.
 *
 * @param owmIconCode - Code icône OWM (ex. "01d", "11n").
 * @returns Couleur hexadécimale, gris neutre par défaut.
 */
export function getWeatherColor(owmIconCode: string): string {
  return WEATHER_COLORS[owmIconCode] ?? "#90A4AE";
}
