"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  apiAdminGetUsers,
  apiAdminDeleteUser,
  apiAdminDeleteFavorite,
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

// ---------------------------------------------------------------------------
// Custom confirm dialog
// ---------------------------------------------------------------------------

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "warning";
  onConfirm: () => void;
}

function ConfirmDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-surface-variant rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${state.variant === "danger" ? "bg-error/15" : "bg-yellow-400/15"}`}>
            <span className={`material-symbols-outlined ${state.variant === "danger" ? "text-error" : "text-yellow-400"}`}>
              {state.variant === "danger" ? "delete_forever" : "warning"}
            </span>
          </div>
          <div>
            <p className="font-semibold text-on-surface">{state.title}</p>
            <p className="text-sm text-on-surface-variant mt-1">{state.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${state.variant === "danger" ? "bg-error text-white hover:bg-error/80" : "bg-yellow-400 text-black hover:bg-yellow-300"}`}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { user, getToken, loading: authLoading } = useAuth();

  const [tab, setTab]               = useState<Tab>("users");
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [tables, setTables]         = useState<TablesOverview | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeTable, setActiveTable]   = useState<keyof TablesOverview>("users");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [error, setError]           = useState<string | null>(null);
  const [loadingData, setLoadingData]   = useState(false);
  const [dialog, setDialog]         = useState<DialogState>({
    open: false, title: "", message: "", variant: "danger", onConfirm: () => {},
  });

  const closeDialog = useCallback(() => setDialog((d) => ({ ...d, open: false })), []);

  const ask = useCallback((
    title: string, message: string, variant: "danger" | "warning", onConfirm: () => void
  ) => {
    setDialog({ open: true, title, message, variant, onConfirm });
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoadingData(true);
    setError(null);
    getToken()
      .then(async (token) => {
        const [u, t] = await Promise.all([apiAdminGetUsers(token), apiAdminGetTables(token)]);
        setUsers(u);
        setTables(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false));
  }, [user, authLoading]);

  // Reset selection when switching tables
  useEffect(() => { setSelectedRows(new Set()); }, [activeTable]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const removeFromState = useCallback((table: keyof TablesOverview, ids: string[]) => {
    const idSet = new Set(ids);
    if (table === "users") {
      setUsers((prev) => prev.filter((u) => !idSet.has(u.id)));
    } else if (table === "favorites") {
      setUsers((prev) => prev.map((u) => ({ ...u, favorites: u.favorites.filter((f) => !idSet.has(f.id)) })));
    }
    setTables((prev) => prev ? {
      ...prev,
      [table]: {
        ...prev[table],
        data: prev[table].data.filter((r) => r.id && !idSet.has(r.id)),
        total: prev[table].total - ids.length,
      },
    } : prev);
    setSelectedRows((prev) => { const next = new Set(prev); ids.forEach((id) => next.delete(id)); return next; });
  }, []);

  const doDelete = useCallback(async (table: keyof TablesOverview, ids: string[]) => {
    const token = await getToken();
    await Promise.all(ids.map((id) =>
      table === "users" ? apiAdminDeleteUser(token, id) : apiAdminDeleteFavorite(token, id)
    ));
    removeFromState(table, ids);
  }, [getToken, removeFromState]);

  const handleDeleteUser = (userId: string, email: string) => {
    ask(
      "Supprimer ce compte",
      `Le compte de ${email} et toutes ses données seront supprimés définitivement.`,
      "danger",
      () => doDelete("users", [userId]),
    );
  };

  const handleDeleteFavorite = (userId: string, favoriteId: string, cityName: string) => {
    void userId;
    ask(
      "Supprimer ce favori",
      `Le favori "${cityName}" sera supprimé définitivement.`,
      "danger",
      () => doDelete("favorites", [favoriteId]),
    );
  };

  const handleDeleteFromTable = (table: keyof TablesOverview, id: string) => {
    const label = table === "users" ? "ce compte" : "ce favori";
    ask(
      `Supprimer ${label}`,
      `L'entrée (id: ${id.slice(0, 8)}…) sera supprimée définitivement.`,
      "danger",
      () => doDelete(table, [id]),
    );
  };

  const handleBulkDelete = (table: keyof TablesOverview) => {
    const ids = Array.from(selectedRows);
    const label = table === "users" ? `${ids.length} compte${ids.length > 1 ? "s" : ""}` : `${ids.length} favori${ids.length > 1 ? "s" : ""}`;
    ask(
      `Supprimer ${label}`,
      `Cette action est irréversible. Les ${ids.length} lignes sélectionnées seront définitivement supprimées.`,
      "danger",
      () => doDelete(table, ids),
    );
  };

  // ---------------------------------------------------------------------------
  // Table selection helpers
  // ---------------------------------------------------------------------------

  const tableRows = tables ? tables[activeTable].data : [];
  const selectableIds = tableRows.map((r) => r.id).filter(Boolean) as string[];
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedRows.has(id));

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableIds));
    }
  };

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center text-on-surface">Chargement...</div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center text-on-surface">
      <p>Accès refusé — vous devez être connecté.</p>
    </div>
  );

  if (error?.includes("403") || error === "Admin access required") return (
    <div className="min-h-screen flex items-center justify-center text-on-surface">
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold text-error">Accès refusé</p>
        <p className="text-on-surface-variant">Votre compte n&apos;a pas les droits administrateur.</p>
      </div>
    </div>
  );

  const canDelete = activeTable === "users" || activeTable === "favorites";

  return (
    <>
      <ConfirmDialog state={dialog} onClose={closeDialog} />

      <div className="min-h-screen bg-surface text-on-surface p-6 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Back-office</h1>
              <p className="text-on-surface-variant text-sm mt-1">
                Connecté en tant que <span className="font-medium text-primary">{user.email}</span>
              </p>
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
                            <div key={f.id} className="bg-surface/50 rounded-xl p-3 text-sm flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{f.city_name}</p>
                                <p className="text-xs text-on-surface-variant">{f.lat.toFixed(4)}, {f.lon.toFixed(4)}</p>
                                <p className="text-xs text-on-surface-variant">Pos. {f.position} · {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteFavorite(u.id, f.id, f.city_name)}
                                className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors flex-shrink-0"
                                title="Supprimer ce favori"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-on-surface-variant mt-3">
                        ID : <code className="bg-surface-variant/50 px-1 rounded">{u.id}</code>
                      </p>
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

              {/* Bulk delete bar */}
              {canDelete && selectedRows.size > 0 && (
                <div className="flex items-center justify-between bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium text-error">
                    {selectedRows.size} ligne{selectedRows.size > 1 ? "s" : ""} sélectionnée{selectedRows.size > 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={() => handleBulkDelete(activeTable)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-white text-sm font-semibold hover:bg-error/80 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                    Supprimer la sélection
                  </button>
                </div>
              )}

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
                          {canDelete && (
                            <th className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleAll}
                                className="rounded accent-primary w-4 h-4 cursor-pointer"
                              />
                            </th>
                          )}
                          {cols.map((col) => (
                            <th key={col} className="px-4 py-3 text-left font-semibold text-on-surface-variant whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                          {canDelete && <th className="px-4 py-3 w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.data.map((row, i) => {
                          const id = row.id ?? null;
                          const isSelected = id ? selectedRows.has(id) : false;
                          return (
                            <tr
                              key={i}
                              className={`border-t border-surface-variant transition-colors ${isSelected ? "bg-error/5" : "hover:bg-surface-variant/20"}`}
                            >
                              {canDelete && (
                                <td className="px-4 py-2.5">
                                  {id && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleRow(id)}
                                      className="rounded accent-primary w-4 h-4 cursor-pointer"
                                    />
                                  )}
                                </td>
                              )}
                              {cols.map((col) => (
                                <td key={col} className="px-4 py-2.5 text-on-surface-variant font-mono text-xs max-w-xs truncate">
                                  {row[col] ?? <span className="opacity-40">null</span>}
                                </td>
                              ))}
                              {canDelete && (
                                <td className="px-2 py-2">
                                  {id && (
                                    <button
                                      onClick={() => handleDeleteFromTable(activeTable, id)}
                                      className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                                      title="Supprimer"
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
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
    </>
  );
}
