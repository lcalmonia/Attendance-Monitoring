import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getSessionUserId } from "../lib/auth";

export default async (req: Request) => {
  const userId = await getSessionUserId(req);
  if (!userId) return Response.json({ error: "Unauthorized." }, { status: 401 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });

  const body = await req.json();
  if (!body || typeof body !== "object" || !body.action) {
    return Response.json({ error: "A mutation action is required." }, { status: 400 });
  }

  const db = getDatabase();

  if (body.action === "upsert") {
    if (!body.record || typeof body.record !== "object" || typeof body.record.id !== "string") {
      return Response.json({ error: "A valid attendance record is required." }, { status: 400 });
    }

    const incoming = JSON.stringify(body.record);
    const rows = await db.sql<{ state: unknown }>`
      SELECT state FROM app_state WHERE id = 'default' LIMIT 1
    `;
    const state = rows[0]?.state && typeof rows[0].state === "object" && !Array.isArray(rows[0].state)
      ? rows[0].state as Record<string, unknown>
      : {};
    const records = Array.isArray(state.attendanceRecords)
      ? state.attendanceRecords as Record<string, unknown>[]
      : [];

    const index = records.findIndex((record) => record.id === body.record.id);
    const nextRecords = [...records];
    if (index < 0) {
      nextRecords.push(body.record);
    } else {
      const existing = nextRecords[index];
      const isExplicitAdjustment = body.record.isAdjusted === true && typeof body.record.adjustedAt === "string";
      if (isExplicitAdjustment) {
        nextRecords[index] = { ...existing, ...body.record };
      } else {
        const merged = { ...existing };
        for (const [key, value] of Object.entries(body.record)) {
          if (value !== undefined && value !== null && value !== "") merged[key] = value;
        }
        nextRecords[index] = merged;
      }
    }

    await db.sql`
      UPDATE app_state
      SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{attendanceRecords}', ${JSON.stringify(nextRecords)}::jsonb),
          updated_at = NOW()
      WHERE id = 'default'
    `;
    return Response.json({ success: true, recordId: body.record.id });
  }

  if (body.action === "delete") {
    if (typeof body.recordId !== "string") return Response.json({ error: "recordId is required." }, { status: 400 });

    const rows = await db.sql<{ state: unknown }>`
      SELECT state FROM app_state WHERE id = 'default' LIMIT 1
    `;
    const state = rows[0]?.state && typeof rows[0].state === "object" && !Array.isArray(rows[0].state)
      ? rows[0].state as Record<string, unknown>
      : {};
    const records = Array.isArray(state.attendanceRecords)
      ? state.attendanceRecords as Record<string, unknown>[]
      : [];
    const nextRecords = records.filter((record) => record.id !== body.recordId);

    await db.sql`
      UPDATE app_state
      SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{attendanceRecords}', ${JSON.stringify(nextRecords)}::jsonb),
          updated_at = NOW()
      WHERE id = 'default'
    `;
    return Response.json({ success: true, recordId: body.recordId });
  }

  return Response.json({ error: "Unsupported mutation action." }, { status: 400 });
};

export const config: Config = { path: "/api/attendance-mutation" };
