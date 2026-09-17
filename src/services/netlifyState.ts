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

const APP_STATE_TIMEOUT_MS = 10000;
const MUTATION_TIMEOUT_MS = 10000;

// Whole-app persistence is allowed only after a successful shared-state read.
// If hydration times out/fails, local fallback data must never be allowed to
// overwrite the server snapshot through the secondary save path.
let sharedStateReady = false;

function withTimeout(init: RequestInit | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId, request: { ...(init || {}), signal: controller.signal } };
}

async function attendanceRequest<T>(init?: RequestInit): Promise<T> {
  const { controller, timeoutId, request } = withTimeout(init, MUTATION_TIMEOUT_MS);
  try {
    const response = await fetch("/api/attendance-mutation", {
      credentials: "same-origin",
      ...request,
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Attendance synchronization timed out; the local record was retained.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_STATE_TIMEOUT_MS);

  try {
    const response = await fetch("/api/app-state", {
      credentials: "same-origin",
      headers: authHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Unable to load shared application state (${response.status}).`);
    const payload = await response.json();
    const state = payload?.state && typeof payload.state === "object" ? payload.state as PersistedAppState : null;
    if (state) sharedStateReady = true;
    return state ? mergeLocalAttendance(state) : state;
  } catch (error) {
    sharedStateReady = false;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Shared application state timed out; continuing with local data.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  if (!sharedStateReady) {
    throw new Error("Shared application state has not hydrated successfully; skipping whole-app save.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_STATE_TIMEOUT_MS);
  try {
    const response = await fetch("/api/app-state", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "same-origin",
      body: JSON.stringify(state),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Unable to save shared application state (${response.status}).`);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Shared application state save timed out; local changes were retained.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
