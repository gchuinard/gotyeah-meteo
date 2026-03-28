import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { THEMES } from "@/lib/themes";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeatherNow",
  description: "Real-time weather forecasts powered by OpenWeatherMap",
};

// Sérialise les thèmes en map id→objet pour le script anti-flash (évalué une fois à la compilation)
const themesMap = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/**
 * Script inline exécuté de façon synchrone avant tout rendu.
 * Lit le thème mis en cache dans localStorage et applique les variables CSS immédiatement,
 * ce qui évite le flash du thème par défaut lors du rechargement de page.
 */
const themeInitScript = `(function(){try{
  var T=${JSON.stringify(themesMap)};
  var id=localStorage.getItem('wn_theme')||'ocean';
  var t=T[id]||T['ocean'];
  var r=document.documentElement;
  r.style.setProperty('--wn-primary',t.primary);
  r.style.setProperty('--wn-tertiary',t.tertiary);
  r.style.setProperty('--wn-bg',t.bg);
  r.style.setProperty('--wn-surface-cl',t.surfaceCl);
  r.style.setProperty('--wn-surface-c',t.surfaceC);
  r.style.setProperty('--wn-surface-ch',t.surfaceCh);
  r.style.setProperty('--wn-surface-cgh',t.surfaceCgh);
  r.style.setProperty('--wn-on-surface',t.onSurface);
  r.style.setProperty('--wn-on-surface-v',t.onSurfaceV);
  r.style.setProperty('--wn-on-primary',t.onPrimary);
  if(t.light)r.setAttribute('data-light','true');
  else r.removeAttribute('data-light');
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Applique le thème depuis localStorage avant le premier rendu — évite le flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Material Symbols Outlined — used for weather icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen bg-[#0b1326] text-[#dae2fd]`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
