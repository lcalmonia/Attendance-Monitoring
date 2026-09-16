const TOKEN_KEY = "worksphere_auth_token";
const API_TIMEOUT_MS = 15000;

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const token = getAuthToken();
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const rawBody = await response.text();
    let data: Record<string, unknown> = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // Keep the raw response available for a useful HTTP error below.
      }
    }

    if (!response.ok) {
      const serverError = typeof data.error === "string" ? data.error : "";
      const fallback = rawBody.trim().replace(/\s+/g, " ").slice(0, 180);
      throw new Error(serverError || fallback || `Request failed (HTTP ${response.status}).`);
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Authentication service timed out. Please try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("Unable to reach the authentication service. Please check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const authApi = {
  status: () => api("/api/auth/status"),
  setup: (payload: Record<string, string>) => api("/api/auth/setup", { method: "POST", body: JSON.stringify(payload) }),
  login: async (loginId: string, password: string) => {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
    setAuthToken(String(data.token));
    return data;
  },
  session: () => api("/api/auth/session") as Promise<Session>,
  logout: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } finally { clearAuthToken(); }
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword })),
  provision: (userId: string, employeeId: string, temporaryPassword?: string, mobileNumber?: string) =>
    api("/api/auth/provision", { method: "POST", body: JSON.stringify({ userId, employeeId, temporaryPassword, mobileNumber }) }),
  deleteAccount: (userId: string) => api("/api/auth/delete", { method: "POST", body: JSON.stringify({ userId }) }),
  syncLogin: (userId: string, employeeId: string, mobileNumber: string) =>
    api("/api/auth/sync-login", { method: "POST", body: JSON.stringify({ userId, employeeId, mobileNumber }) }),
};
