const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface AdminFavorite {
  id: string;
  city_name: string;
  lat: number;
  lon: number;
  position: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  theme: string | null;
  favorites: AdminFavorite[];
}

export interface TableRow {
  data: Record<string, string | null>[];
  total: number;
}

export interface TablesOverview {
  users: TableRow;
  favorites: TableRow;
  preferences: TableRow;
  refresh_tokens: TableRow;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiAdminGetUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminUser[]>(res);
}

export async function apiAdminDeleteUser(token: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
}

export async function apiAdminGetTables(token: string): Promise<TablesOverview> {
  const res = await fetch(`${API_URL}/admin/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<TablesOverview>(res);
}
