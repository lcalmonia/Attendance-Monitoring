function authHeaders() {
  const token = localStorage.getItem("worksphere_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PersistedAppState {
  [key: string]: unknown;
}

type AttendanceState = Record<string, unknown>;

function mergeAttendanceFromLocalStorage(state: PersistedAppState): PersistedAppState {
  try {
    const raw = localStorage.getItem("worksphere_cv_attendance");
    if (!raw) return state;
    const localAttendance = JSON.parse(raw);
    if (!Array.isArray(localAttendance)) return state;

    const remoteAttendance = Array.isArray(state.attendanceRecords)
      ? state.attendanceRecords as AttendanceState[]
      : [];
    const byId = new Map<string, AttendanceState>();

    for (const record of remoteAttendance) {
      if (typeof record?.id === "string") byId.set(record.id, { ...record });
    }

    // A clock action can occur while the initial shared-state GET is still
    // loading. React would otherwise hydrate the remote snapshot over the
    // just-created local clock record. Keep local records that are not yet in
    // the remote snapshot so the normal save effect can publish them.
    for (const record of localAttendance as AttendanceState[]) {
      if (typeof record?.id !== "string") continue;
      const existing = byId.get(record.id);
      if (!existing) {
        byId.set(record.id, { ...record });
        continue;
      }
      const merged = { ...existing };
      for (const [key, value] of Object.entries(record)) {
        if (value !== undefined && value !== null && value !== "") merged[key] = value;
      }
      byId.set(record.id, merged);
    }

    return { ...state, attendanceRecords: Array.from(byId.values()) };
  } catch (error) {
    console.warn("Unable to reconcile local attendance cache with shared state", error);
    return state;
  }
}

export async function loadAppState(): Promise<PersistedAppState | null> {
  const response = await fetch("/api/app-state", { credentials: "same-origin", headers: authHeaders() });
  if (!response.ok) throw new Error(`Unable to load shared application state (${response.status}).`);
  const payload = await response.json();
  if (!payload?.state || typeof payload.state !== "object") return null;
  return mergeAttendanceFromLocalStorage(payload.state as PersistedAppState);
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
