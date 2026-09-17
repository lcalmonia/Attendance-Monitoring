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
  const rows = await db.sql<{ state: unknown }>`
    SELECT state FROM app_state WHERE id = 'default' LIMIT 1
  `;
  const state = (rows[0]?.state && typeof rows[0].state === "object" && !Array.isArray(rows[0].state))
    ? rows[0].state as Record<string, unknown>
    : {};
  const records = Array.isArray(state.attendanceRecords)
    ? state.attendanceRecords as Record<string, unknown>[]
    : [];

  if (body.action === "upsert") {
    if (!body.record || typeof body.record !== "object" || typeof body.record.id !== "string") {
      return Response.json({ error: "A valid attendance record is required." }, { status: 400 });
    }
    const incoming = body.record as Record<string, unknown>;
    const index = records.findIndex((record) => record.id === incoming.id);
    const nextRecords = [...records];
    if (index < 0) nextRecords.push(incoming);
    else nextRecords[index] = { ...nextRecords[index], ...incoming };

    await db.sql`
      UPDATE app_state
      SET state = jsonb_set(state, '{attendanceRecords}', ${JSON.stringify(nextRecords)}::jsonb), updated_at = NOW()
      WHERE id = 'default'
    `;
    return Response.json({ success: true });
  }

  if (body.action === "delete") {
    const recordId = body.recordId;
    if (typeof recordId !== "string") return Response.json({ error: "recordId is required." }, { status: 400 });
    const nextRecords = records.filter((record) => record.id !== recordId);
    await db.sql`
      UPDATE app_state
      SET state = jsonb_set(state, '{attendanceRecords}', ${JSON.stringify(nextRecords)}::jsonb), updated_at = NOW()
      WHERE id = 'default'
    `;
    return Response.json({ success: true });
  }

  return Response.json({ error: "Unsupported mutation action." }, { status: 400 });
};

export const config: Config = { path: "/api/attendance-mutation" };
