import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable · WeatherNow",
  robots: { index: false, follow: false },
};

/**
 * Page 404 globale, rendue pour toute adresse inconnue et pour chaque appel à notFound().
 *
 * Server component, sans état : le layout racine lit headers() pour le nonce CSP, la route
 * /_not-found est donc rendue à la demande et ses scripts reçoivent le nonce comme les autres.
 *
 * Bilingue FR/EN, en dur : la langue choisie sur l'accueil n'est qu'un état React de
 * app/page.tsx (ni cookie, ni localStorage), un composant client ne pourrait pas la
 * retrouver ici. On affiche donc le français, langue par défaut du site, puis l'anglais.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-on-surface flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg space-y-8 text-center">
        <p className="text-2xl font-black tracking-tighter text-primary">WeatherNow</p>

        <div className="bg-surface-container-high border border-white/5 rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl">
          <span className="material-symbols-outlined !text-6xl text-primary" aria-hidden="true">
            cloud_off
          </span>

          <div>
            <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-widest">
              Erreur 404
            </p>
            <h1 className="text-3xl font-bold mt-2">Page introuvable</h1>
            <p className="text-on-surface-variant mt-3">
              Cette adresse ne correspond à aucune page. Le lien est peut-être incomplet, ou la page
              a été déplacée.
            </p>
          </div>

          <div lang="en" className="pt-6 border-t border-white/10">
            <p className="text-lg font-semibold">Page not found</p>
            <p className="text-sm text-on-surface-variant mt-2">
              This address does not match any page. The link may be incomplete, or the page may
              have moved.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined !text-lg" aria-hidden="true">
                home
              </span>
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/"
              lang="en"
              className="text-sm text-on-surface-variant hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
