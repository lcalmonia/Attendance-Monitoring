function authHeaders() {
  const token = localStorage.getItem("worksphere_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PersistedAppState {
  [key: string]: unknown;
}

export interface AttendanceMutationRecord {
  id: string;
  employeeId: string;
  businessId: string;
  [key: string]: unknown;
}

async function attendanceRequest<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/attendance-mutation", {
    credentials: "same-origin",
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Unable to synchronize attendance (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function mergeLocalAttendance(state: PersistedAppState): PersistedAppState {
  try {
    const raw = localStorage.getItem("worksphere_cv_attendance");
    if (!raw) return state;
    const localRecords = JSON.parse(raw);
    if (!Array.isArray(localRecords)) return state;

    const remoteRecords = Array.isArray(state.attendanceRecords) ? state.attendanceRecords : [];
    const byId = new Map<string, Record<string, unknown>>();

    for (const record of remoteRecords) {
      if (record && typeof record === "object" && typeof (record as Record<string, unknown>).id === "string") {
        byId.set((record as Record<string, unknown>).id as string, { ...(record as Record<string, unknown>) });
      }
    }

    for (const record of localRecords) {
      if (!record || typeof record !== "object" || typeof (record as Record<string, unknown>).id !== "string") continue;
      const incoming = record as Record<string, unknown>;
      const id = incoming.id as string;
      const current = byId.get(id);
      if (!current) {
        byId.set(id, { ...incoming });
        continue;
      }
      for (const [key, value] of Object.entries(incoming)) {
        if (value !== undefined && value !== null && value !== "") current[key] = value;
      }
      byId.set(id, current);
    }

    return { ...state, attendanceRecords: Array.from(byId.values()) };
  } catch (error) {
    console.warn("Unable to reconcile local attendance cache", error);
    return state;
  }
}

export async function loadAppState(): Promise<PersistedAppState | null> {
  const response = await fetch("/api/app-state", { credentials: "same-origin", headers: authHeaders() });
  if (!response.ok) throw new Error(`Unable to load shared application state (${response.status}).`);
  const payload = await response.json();
  const state = payload?.state && typeof payload.state === "object" ? payload.state as PersistedAppState : null;
  return state ? mergeLocalAttendance(state) : state;
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

export async function upsertAttendanceRecord(
  record: AttendanceMutationRecord,
  source: "clock" | "admin" = "clock"
): Promise<AttendanceMutationRecord> {
  const payload = await attendanceRequest<{ success: boolean; record: AttendanceMutationRecord }>({
    method: "POST",
    body: JSON.stringify({ action: "upsert", source, record }),
  });
  return payload.record;
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  await attendanceRequest({
    method: "POST",
    body: JSON.stringify({ action: "delete", recordId }),
  });
}

export async function loadAttendanceRecords(): Promise<AttendanceMutationRecord[]> {
  const payload = await attendanceRequest<{ records?: AttendanceMutationRecord[] }>();
  return Array.isArray(payload.records) ? payload.records : [];
}
