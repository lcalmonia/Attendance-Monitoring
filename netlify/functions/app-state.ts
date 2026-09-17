import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getSessionUserId } from "../lib/auth";

type AppStateRow = { state: unknown; updated_at: string };

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

    const existingState = (rows[0]?.state && typeof rows[0].state === "object" && !Array.isArray(rows[0].state))
      ? rows[0].state as Record<string, unknown>
      : {};

    const incomingAttendance = Array.isArray(body.attendanceRecords)
      ? body.attendanceRecords as Record<string, unknown>[]
      : null;
    const existingAttendance = Array.isArray(existingState.attendanceRecords)
      ? existingState.attendanceRecords as Record<string, unknown>[]
      : [];

    let mergedAttendance: Record<string, unknown>[] | null = null;
    if (incomingAttendance) {
      const byId = new Map<string, Record<string, unknown>>();
      existingAttendance.forEach((record) => {
        if (typeof record.id === "string") byId.set(record.id, record);
      });

      incomingAttendance.forEach((incoming) => {
        const id = typeof incoming.id === "string" ? incoming.id : undefined;
        if (!id) return;
        const existing = byId.get(id);
        if (!existing) {
          byId.set(id, incoming);
          return;
        }

        const existingAdjustedAt = typeof existing.adjustedAt === "string" ? existing.adjustedAt : "";
        const incomingAdjustedAt = typeof incoming.adjustedAt === "string" ? incoming.adjustedAt : "";
        if (existing.isAdjusted && !incoming.isAdjusted) return;
        if (existing.isAdjusted && incoming.isAdjusted && existingAdjustedAt > incomingAdjustedAt) return;

        byId.set(id, { ...existing, ...incoming });
      });

      mergedAttendance = Array.from(byId.values());
    }

    const nextState: Record<string, unknown> = { ...existingState, ...body };
    if (mergedAttendance) nextState.attendanceRecords = mergedAttendance;

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
