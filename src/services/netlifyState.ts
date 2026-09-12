export interface PersistedAppState {
  [key: string]: unknown;
}

export async function loadAppState(): Promise<PersistedAppState | null> {
  const response = await fetch("/api/app-state", { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load shared application state (${response.status}).`);
  const payload = await response.json();
  return payload?.state && typeof payload.state === "object" ? payload.state : null;
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  const response = await fetch("/api/app-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error(`Unable to save shared application state (${response.status}).`);
}
