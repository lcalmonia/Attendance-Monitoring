const TOKEN_KEY = "worksphere_auth_token";

export type Session = { authenticated: boolean; userId?: string; mustChangePassword?: boolean };

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export const authApi = {
  status: () => api("/api/auth/status"),
  setup: (payload: Record<string, string>) => api("/api/auth/setup", { method: "POST", body: JSON.stringify(payload) }),
  login: async (loginId: string, password: string) => {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
    setAuthToken(data.token);
    return data;
  },
  session: () => api("/api/auth/session") as Promise<Session>,
  logout: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } finally { clearAuthToken(); }
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  provision: (userId: string, employeeId: string, temporaryPassword?: string, mobileNumber?: string) =>
    api("/api/auth/provision", { method: "POST", body: JSON.stringify({ userId, employeeId, temporaryPassword, mobileNumber }) }),
  deleteAccount: (userId: string) =>
    api("/api/auth/delete", { method: "POST", body: JSON.stringify({ userId }) }),
  syncLogin: (userId: string, employeeId: string, mobileNumber: string) =>
    api("/api/auth/sync-login", { method: "POST", body: JSON.stringify({ userId, employeeId, mobileNumber }) }),
};
