import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Génère un nonce par requête et pose une Content-Security-Policy stricte
 * (pas de 'unsafe-inline'). Next.js propage automatiquement ce nonce à ses
 * propres scripts inline dès qu'il détecte un nonce dans l'en-tête CSP de la
 * requête ; le script anti-flash de thème est noncé manuellement dans layout.tsx.
 *
 * Origines autorisées calibrées sur l'app :
 *   - connect-src : API météo + Nominatim (reverse-geocoding)
 *   - img-src     : icônes OpenWeatherMap
 *   - style/font  : Google Fonts (icônes Material Symbols)
 */
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://openweathermap.org",
    "connect-src 'self' https://api-meteo.gautierchuinard.com https://nominatim.openstreetmap.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js lit cet en-tête de requête pour noncer ses scripts inline.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Toutes les routes sauf assets statiques ; on saute les requêtes de prefetch
      // (un nonce y provoquerait un mismatch d'hydratation).
      source: "/((?!_next/static|_next/image|favicon.ico|.well-known).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
