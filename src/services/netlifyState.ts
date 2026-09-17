function authHeaders() {
  const token = localStorage.getItem("worksphere_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PersistedAppState {
  [key: string]: unknown;
}

export async function loadAppState(): Promise<PersistedAppState | null> {
  const response = await fetch("/api/app-state", { credentials: "same-origin", headers: authHeaders() });
  if (!response.ok) throw new Error(`Unable to load shared application state (${response.status}).`);
  const payload = await response.json();
  return payload?.state && typeof payload.state === "object" ? payload.state : null;
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  const response = await fetch("/api/app-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "same-origin",
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error(`Unable to save shared application state (${response.status}).`);
}

export async function upsertAttendanceRecord(record: Record<string, unknown>): Promise<void> {
  const response = await fetch("/api/attendance-mutation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "same-origin",
    body: JSON.stringify({ action: "upsert", record }),
  });
  if (!response.ok) throw new Error(`Unable to persist attendance record (${response.status}).`);
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  const response = await fetch("/api/attendance-mutation", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "same-origin",
    body: JSON.stringify({ action: "delete", recordId }),
  });
  if (!response.ok) throw new Error(`Unable to delete attendance record (${response.status}).`);
}
