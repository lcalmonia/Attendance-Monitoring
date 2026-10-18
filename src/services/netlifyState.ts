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
