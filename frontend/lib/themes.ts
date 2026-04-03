/**
 * @file themes.ts
 * @description Définition des thèmes visuels (ambiances) de WeatherNow — données partagées entre client et serveur.
 */

export interface Theme {
  id: string;
  name: string;
  light: boolean;
  primary: string;
  tertiary: string;
  bg: string;
  surfaceCl: string;
  surfaceC: string;
  surfaceCh: string;
  surfaceCgh: string;
  onSurface: string;
  onSurfaceV: string;
  onPrimary: string;
}

export const THEMES: Theme[] = [
  {
    id: "ocean", name: "Océan", light: false,
    primary:    "123 208 255", tertiary:   "222 194 154",
    bg:         "11 19 38",    surfaceCl:  "6 14 32",
    surfaceC:   "23 31 51",    surfaceCh:  "34 42 61",
    surfaceCgh: "45 52 73",
    onSurface:  "218 226 253", onSurfaceV: "198 198 205", onPrimary: "0 53 74",
  },
  {
    id: "aurora", name: "Aurora", light: false,
    primary:    "105 240 174", tertiary:   "234 128 252",
    bg:         "10 20 14",    surfaceCl:  "5 12 8",
    surfaceC:   "18 32 22",    surfaceCh:  "28 44 32",
    surfaceCgh: "40 58 44",
    onSurface:  "210 248 225", onSurfaceV: "180 210 190", onPrimary: "5 60 30",
  },
  {
    id: "sunset", name: "Coucher de soleil", light: false,
    primary:    "255 138 101", tertiary:   "255 213 79",
    bg:         "22 10 8",     surfaceCl:  "14 6 4",
    surfaceC:   "36 18 12",    surfaceCh:  "50 26 18",
    surfaceCgh: "66 34 24",
    onSurface:  "255 222 210", onSurfaceV: "220 180 165", onPrimary: "80 20 0",
  },
  {
    id: "midnight", name: "Minuit", light: false,
    primary:    "206 147 216", tertiary:   "128 222 234",
    bg:         "8 8 18",      surfaceCl:  "4 4 12",
    surfaceC:   "16 14 32",    surfaceCh:  "26 22 46",
    surfaceCgh: "38 32 62",
    onSurface:  "230 220 255", onSurfaceV: "190 180 220", onPrimary: "50 10 70",
  },
  {
    id: "jour", name: "Jour", light: true,
    primary:    "14 120 200",  tertiary:   "200 100 10",
    bg:         "238 244 255", surfaceCl:  "255 255 255",
    surfaceC:   "255 255 255", surfaceCh:  "232 240 255",
    surfaceCgh: "215 228 252",
    onSurface:  "10 16 40",    onSurfaceV: "70 80 120",   onPrimary: "255 255 255",
  },
  {
    id: "pastel", name: "Pastel", light: true,
    primary:    "130 60 200",  tertiary:   "210 60 110",
    bg:         "248 244 255", surfaceCl:  "255 255 255",
    surfaceC:   "255 255 255", surfaceCh:  "242 236 255",
    surfaceCgh: "228 218 252",
    onSurface:  "28 10 45",    onSurfaceV: "90 70 120",   onPrimary: "255 255 255",
  },
];
