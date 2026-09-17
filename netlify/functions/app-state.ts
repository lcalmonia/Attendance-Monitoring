import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getSessionUserId } from "../lib/auth";

type AppStateRow = { state: unknown; updated_at: string };
type AttendanceRecordState = Record<string, unknown>;

/**
 * Merge attendance records by record ID instead of allowing a stale device
 * snapshot to replace the shared attendance collection.
 *
 * Clock actions are append/enrichment operations: a newer snapshot may add
 * break/time-out fields, while an older snapshot must not erase fields that
 * are already present in the database. Admin adjustments are explicitly
 * marked with isAdjusted + adjustedAt and are allowed to replace fields.
 */
function mergeAttendanceRecords(
  currentValue: unknown,
  incomingValue: unknown,
): AttendanceRecordState[] {
  const current = Array.isArray(currentValue) ? currentValue as AttendanceRecordState[] : [];
  const incoming = Array.isArray(incomingValue) ? incomingValue as AttendanceRecordState[] : [];
  const byId = new Map<string, AttendanceRecordState>();

  for (const record of current) {
    if (typeof record.id === "string") byId.set(record.id, { ...record });
  }

  for (const record of incoming) {
    if (typeof record.id !== "string") continue;
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, { ...record });
      continue;
    }

    const isExplicitAdjustment = record.isAdjusted === true && typeof record.adjustedAt === "string";
    if (isExplicitAdjustment) {
      byId.set(record.id, { ...existing, ...record });
      continue;
    }

    const merged = { ...existing };
    for (const [key, value] of Object.entries(record)) {
      // Stale device snapshots commonly omit fields that another device has
      // already recorded. Never let undefined/null/empty values erase them.
      if (value !== undefined && value !== null && value !== "") merged[key] = value;
    }
    byId.set(record.id, merged);
  }

  return Array.from(byId.values());
}

export default async (req: Request) => {
  const userId = await getSessionUserId(req);
  if (!userId) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const db = getDatabase();

  if (req.method === "GET") {
    const rows = await db.sql<AppStateRow>`
      SELECT state, updated_at
      FROM app_state
      WHERE id = 'default'
      LIMIT 1
    `;

    const row = rows[0];
    return Response.json({ state: row?.state ?? {}, updatedAt: row?.updated_at ?? null });
  }

  if (req.method === "PUT") {
    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "State must be a JSON object." }, { status: 400 });
    }

    const rows = await db.sql<AppStateRow>`
      SELECT state, updated_at
      FROM app_state
      WHERE id = 'default'
      LIMIT 1
    `;
    const currentState = rows[0]?.state && typeof rows[0].state === "object" && !Array.isArray(rows[0].state)
      ? rows[0].state as Record<string, unknown>
      : {};

    const nextState = {
      ...body,
      // Attendance is the one collection that is actively mutated by many
      // devices. Merge it by record ID rather than replacing the collection.
      attendanceRecords: mergeAttendanceRecords(currentState.attendanceRecords, body.attendanceRecords),
    };

    await db.sql`
      INSERT INTO app_state (id, state, updated_at)
      VALUES ('default', ${JSON.stringify(nextState)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
    `;

    return Response.json({ success: true });
  }

  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, PUT" } });
};

export const config: Config = { path: "/api/app-state" };
