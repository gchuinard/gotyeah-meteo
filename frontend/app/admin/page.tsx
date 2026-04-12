"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  apiAdminGetUsers,
  apiAdminDeleteUser,
  apiAdminGetTables,
  type AdminUser,
  type TablesOverview,
} from "@/lib/api/admin";

type Tab = "users" | "tables";

const TABLE_LABELS: Record<string, string> = {
  users: "Utilisateurs",
  favorites: "Favoris",
  preferences: "Préférences",
  refresh_tokens: "Refresh tokens",
};

export default function AdminPage() {
  const { user, getToken, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tables, setTables] = useState<TablesOverview | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<keyof TablesOverview>("users");
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoadingData(true);
    setError(null);
    getToken()
      .then(async (token) => {
        const [u, t] = await Promise.all([
          apiAdminGetUsers(token),
          apiAdminGetTables(token),
        ]);
        setUsers(u);
        setTables(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false));
  }, [user, authLoading]);

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Supprimer le compte de ${email} ? Cette action est irréversible.`)) return;
    try {
      const token = await getToken();
      await apiAdminDeleteUser(token, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: unknown) {
      alert(`Erreur : ${e instanceof Error ? e.message : "inconnue"}`);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface">
        <p>Accès refusé — vous devez être connecté.</p>
      </div>
    );
  }

  if (error?.includes("403") || error === "Admin access required") {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-error">Accès refusé</p>
          <p className="text-on-surface-variant">Votre compte n&apos;a pas les droits administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Back-office</h1>
            <p className="text-on-surface-variant text-sm mt-1">Connecté en tant que <span className="font-medium text-primary">{user.email}</span></p>
          </div>
          <a href="/" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            ← Retour au site
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-variant">
          {(["users", "tables"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "users" ? `Utilisateurs (${users.length})` : "Tables SQL"}
            </button>
          ))}
        </div>

        {loadingData && (
          <div className="text-center text-on-surface-variant py-12">Chargement des données...</div>
        )}

        {error && !loadingData && (
          <div className="bg-error/10 text-error rounded-xl p-4 text-sm">{error}</div>
        )}

        {/* ---- Users tab ---- */}
        {!loadingData && tab === "users" && (
          <div className="space-y-3">
            {users.length === 0 && <p className="text-on-surface-variant text-sm">Aucun utilisateur.</p>}
            {users.map((u) => (
              <div key={u.id} className="bg-surface-variant/30 rounded-2xl overflow-hidden border border-surface-variant">
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-variant/50 transition-colors"
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{u.username ?? <span className="text-on-surface-variant italic">Sans pseudo</span>}</p>
                      <p className="text-xs text-on-surface-variant">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-4 text-xs text-on-surface-variant">
                      <span>{u.favorites.length} favori{u.favorites.length !== 1 ? "s" : ""}</span>
                      <span>Thème : {u.theme ?? "—"}</span>
                      <span>Créé le {new Date(u.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.email); }}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                      title="Supprimer le compte"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">
                      {expandedUser === u.id ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </div>

                {expandedUser === u.id && (
                  <div className="border-t border-surface-variant px-5 py-4">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Favoris</p>
                    {u.favorites.length === 0 ? (
                      <p className="text-sm text-on-surface-variant italic">Aucun favori enregistré.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {u.favorites.map((f) => (
                          <div key={f.id} className="bg-surface/50 rounded-xl p-3 text-sm">
                            <p className="font-medium">{f.city_name}</p>
                            <p className="text-xs text-on-surface-variant">{f.lat.toFixed(4)}, {f.lon.toFixed(4)}</p>
                            <p className="text-xs text-on-surface-variant">Pos. {f.position} · {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-on-surface-variant mt-3">ID : <code className="bg-surface-variant/50 px-1 rounded">{u.id}</code></p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---- Tables tab ---- */}
        {!loadingData && tab === "tables" && tables && (
          <div className="space-y-4">
            {/* Table selector */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(tables) as (keyof TablesOverview)[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTable(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTable === t
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-variant/30 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {TABLE_LABELS[t]} <span className="opacity-60">({tables[t].total})</span>
                </button>
              ))}
            </div>

            {/* Table viewer */}
            {(() => {
              const tableData = tables[activeTable];
              if (!tableData || tableData.data.length === 0) {
                return <p className="text-on-surface-variant text-sm">Table vide.</p>;
              }
              const cols = Object.keys(tableData.data[0]);
              return (
                <div className="overflow-x-auto rounded-2xl border border-surface-variant">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-variant/40">
                        {cols.map((col) => (
                          <th key={col} className="px-4 py-3 text-left font-semibold text-on-surface-variant whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.data.map((row, i) => (
                        <tr key={i} className="border-t border-surface-variant hover:bg-surface-variant/20 transition-colors">
                          {cols.map((col) => (
                            <td key={col} className="px-4 py-2.5 text-on-surface-variant font-mono text-xs max-w-xs truncate">
                              {row[col] ?? <span className="opacity-40">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableData.total > 100 && (
                    <p className="text-xs text-on-surface-variant text-center py-3 border-t border-surface-variant">
                      Affichage des 100 premières lignes sur {tableData.total} au total.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
