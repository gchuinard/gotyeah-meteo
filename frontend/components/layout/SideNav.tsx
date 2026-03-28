"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { THEMES } from "@/lib/themes";
import { apiUpdatePreferences } from "@/lib/api/user";
import type {
  Units, TempUnit, WindUnit, PressureUnit, PrecipUnit,
  VisUnit, TimeFormat, DateFormat, DistUnit, HeightUnit,
} from "@/lib/units";

interface Props {
  units: Units;
  onUnitsChange: (u: Units) => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

function UnitGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-widest mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
              opt.value === value
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * SideNav
 *
 * Barre latérale desktop et navigation mobile.
 * Contient le modal Profil avec le sélecteur d'ambiance :
 * - prévisualisation immédiate au clic sur une tuile
 * - "Annuler" restaure l'ambiance d'avant l'ouverture du modal
 * - "Valider" persiste le choix en base puis met à jour le cache localStorage
 *
 * @param props.units - Préférences d'unités actives.
 * @param props.onUnitsChange - Callback de mise à jour des unités.
 * @param props.onOpenLogin - Ouvre le modal de connexion.
 * @param props.onOpenRegister - Ouvre le modal d'inscription.
 */
export function SideNav({ units, onUnitsChange, onOpenLogin, onOpenRegister }: Props) {
  const set = <K extends keyof Units>(key: K, val: Units[K]) =>
    onUnitsChange({ ...units, [key]: val });

  const { user, logout, getToken, deleteAccount } = useAuth();
  const { themeId, setTheme }      = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [pseudo, setPseudo]           = useState("");
  const [savedPseudo, setSavedPseudo] = useState("");
  // Snapshot de l'ambiance active au moment de l'ouverture du modal — utilisé par "Annuler"
  const [snapshotId, setSnapshotId]   = useState(themeId);
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  /** Ouvre le modal Profil en capturant l'ambiance courante comme point de restauration. */
  function openProfile() {
    setSnapshotId(themeId);
    setPseudo(savedPseudo);
    setProfileOpen(true);
  }

  /** Annule les modifications : restaure l'ambiance snapshot sans persister. */
  function handleCancel() {
    setTheme(snapshotId, false);
    setProfileOpen(false);
  }

  /**
   * Valide le choix d'ambiance : persiste en base (si connecté) puis met à jour le cache local.
   * En cas d'erreur réseau, le thème prévisualisé reste actif mais n'est pas persisté.
   */
  async function handleValidate() {
    setSaving(true);
    try {
      if (user) {
        const token = await getToken();
        await apiUpdatePreferences(token, { theme: themeId });
      }
    } catch {
      // Non bloquant — on persiste quand même localement
    } finally {
      // Persistance locale systématique — même si l'API échoue
      setTheme(themeId, true);
      setSavedPseudo(pseudo.trim());
      setSaving(false);
      setProfileOpen(false);
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 z-50 flex-col bg-background shadow-[32px_0_64px_-20px_rgba(0,30,44,0.06)]">

        {/* Logo */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <h1 className="text-2xl font-black tracking-tighter text-primary">WeatherNow</h1>
          <p className="text-xs text-on-surface-variant tracking-widest mt-1 uppercase">Paris, FR</p>
        </div>

        {/* Nav */}
        <nav className="px-4 flex-shrink-0">
          {user ? (
            <>
              <button
                onClick={openProfile}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              >
                <span className="material-symbols-outlined">person</span>
                {user?.username || savedPseudo || "Profil"}
              </button>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-red-400 hover:bg-red-400/5"
              >
                <span className="material-symbols-outlined">logout</span>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenLogin}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              >
                <span className="material-symbols-outlined">login</span>
                Connexion
              </button>
              <button
                onClick={onOpenRegister}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              >
                <span className="material-symbols-outlined">person_add</span>
                Créer un compte
              </button>
            </>
          )}
        </nav>

        {/* Divider */}
        <div className="mx-6 my-4 border-t border-white/5 flex-shrink-0" />

        {/* Preferences — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5" style={{ scrollbarWidth: "none" }}>
          <p className="text-xs font-bold text-on-surface uppercase tracking-widest">Préférences</p>

          <UnitGroup<TempUnit>
            label="Température"
            value={units.temp}
            onChange={(v) => set("temp", v)}
            options={[
              { label: "°C", value: "C" },
              { label: "°F", value: "F" },
              { label: "K",  value: "K" },
            ]}
          />

          <UnitGroup<WindUnit>
            label="Vitesse du vent"
            value={units.wind}
            onChange={(v) => set("wind", v)}
            options={[
              { label: "km/h", value: "kmh" },
              { label: "mph",  value: "mph" },
              { label: "m/s",  value: "ms"  },
              { label: "kt",   value: "kt"  },
            ]}
          />

          <UnitGroup<PressureUnit>
            label="Pression"
            value={units.pressure}
            onChange={(v) => set("pressure", v)}
            options={[
              { label: "hPa",  value: "hPa"  },
              { label: "mbar", value: "mbar" },
              { label: "inHg", value: "inHg" },
              { label: "mmHg", value: "mmHg" },
            ]}
          />

          <UnitGroup<PrecipUnit>
            label="Précipitations"
            value={units.precip}
            onChange={(v) => set("precip", v)}
            options={[
              { label: "mm", value: "mm" },
              { label: "in", value: "in" },
            ]}
          />

          <UnitGroup<VisUnit>
            label="Visibilité"
            value={units.vis}
            onChange={(v) => set("vis", v)}
            options={[
              { label: "km", value: "km" },
              { label: "mi", value: "mi" },
            ]}
          />

          <UnitGroup<TimeFormat>
            label="Format horaire"
            value={units.time}
            onChange={(v) => set("time", v)}
            options={[
              { label: "24h",   value: "24h" },
              { label: "AM/PM", value: "12h" },
            ]}
          />

          <UnitGroup<DateFormat>
            label="Format de date"
            value={units.date}
            onChange={(v) => set("date", v)}
            options={[
              { label: "JJ/MM/AAAA", value: "DD/MM/YYYY" },
              { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
              { label: "AAAA-MM-JJ", value: "YYYY-MM-DD" },
            ]}
          />

          <UnitGroup<DistUnit>
            label="Distance"
            value={units.distance}
            onChange={(v) => set("distance", v)}
            options={[
              { label: "km", value: "km" },
              { label: "mi", value: "mi" },
            ]}
          />

          <UnitGroup<HeightUnit>
            label="Hauteur (nuages / neige)"
            value={units.height}
            onChange={(v) => set("height", v)}
            options={[
              { label: "cm", value: "cm" },
              { label: "in", value: "in" },
              { label: "ft", value: "ft" },
            ]}
          />
        </div>

      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 w-full z-50 rounded-t-[1.5rem] bg-surface-container-lowest/40 backdrop-blur-3xl shadow-[0_-8px_32px_0_rgba(0,30,44,0.06)]">
        <div className="flex justify-around items-center px-4 pb-6 pt-2">
          <button
            onClick={openProfile}
            className="flex flex-col items-center justify-center px-4 py-2 rounded-xl active:scale-90 transition-all duration-200 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-medium uppercase tracking-widest mt-1">Profil</span>
          </button>
        </div>
      </nav>

      {/* Profile modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-container-lowest border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">{user?.username || "Profil"}</h2>
            {user && <p className="text-xs text-on-surface-variant mb-6">{user.email}</p>}
            {!user && <div className="mb-6" />}

            {/* Sélecteur d'ambiance */}
            <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider mb-1">Ambiance</p>
            <p className="text-[10px] text-on-surface-variant mb-3">Mode sombre</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {THEMES.filter(t => !t.light).map((t) => {
                const isActive = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    // Prévisualisation immédiate sans persistance — le snapshot permet de revenir en arrière
                    onClick={() => setTheme(t.id, false)}
                    className={[
                      "relative flex flex-col items-start gap-2 p-3 rounded-2xl border transition-all",
                      isActive ? "border-white/30 bg-white/5" : "border-white/5 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.bg})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.primary})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.tertiary})` }} />
                    </div>
                    <span className="text-xs font-semibold text-on-surface">{t.name}</span>
                    {isActive && (
                      <span className="absolute top-2 right-2 material-symbols-outlined text-sm" style={{ color: `rgb(${t.primary})`, fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-on-surface-variant mb-3">Mode clair</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {THEMES.filter(t => t.light).map((t) => {
                const isActive = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id, false)}
                    className={[
                      "relative flex flex-col items-start gap-2 p-3 rounded-2xl border transition-all",
                      isActive ? "border-white/30 bg-white/5" : "border-white/5 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: `rgb(${t.bg})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.primary})` }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.tertiary})` }} />
                    </div>
                    <span className="text-xs font-semibold text-on-surface">{t.name}</span>
                    {isActive && (
                      <span className="absolute top-2 right-2 material-symbols-outlined text-sm" style={{ color: `rgb(${t.primary})`, fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <label className="block text-xs text-on-surface-variant font-semibold uppercase tracking-wider mb-2">
              Pseudo
            </label>
            <input
              autoFocus
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Entrez votre pseudo…"
              className="w-full bg-surface-container-high border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all mb-8"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleValidate}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Valider"}
              </button>
            </div>

            {user && (
              <div className="mt-6 pt-6 border-t border-white/10">
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 rounded-xl border border-red-500/30 text-sm font-semibold text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    Supprimer mon compte
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-on-surface-variant text-center">
                      Action irréversible. Toutes vos données seront supprimées.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        disabled={deleting}
                        onClick={async () => {
                          setDeleting(true);
                          try { await deleteAccount(); } finally { setDeleting(false); setConfirmDelete(false); }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        {deleting ? "Suppression…" : "Confirmer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
