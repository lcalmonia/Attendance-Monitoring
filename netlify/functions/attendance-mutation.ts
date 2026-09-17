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
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO app_state (id, state, updated_at) VALUES ('default', '{}'::jsonb, NOW()) ON CONFLICT (id) DO NOTHING");

    // Serialize the full attendance read/merge/write operation on the single
    // app_state row. This prevents concurrent devices from overwriting each
    // other's attendance records with stale snapshots.
    const rows = await client.query<{ state: unknown }>(
      "SELECT state FROM app_state WHERE id = 'default' FOR UPDATE"
    );
    const state = rows.rows[0]?.state && typeof rows.rows[0].state === "object" && !Array.isArray(rows.rows[0].state)
      ? rows.rows[0].state as Record<string, unknown>
      : {};
    const records = Array.isArray(state.attendanceRecords)
      ? state.attendanceRecords as Record<string, unknown>[]
      : [];

    if (body.action === "upsert") {
      if (!body.record || typeof body.record !== "object" || typeof body.record.id !== "string") {
        await client.query("ROLLBACK");
        return Response.json({ error: "A valid attendance record is required." }, { status: 400 });
      }

      const incoming = body.record as Record<string, unknown>;
      const index = records.findIndex((record) => record.id === incoming.id);
      const nextRecords = [...records];
      if (index < 0) {
        nextRecords.push(incoming);
      } else {
        const existing = nextRecords[index];
        const isExplicitAdjustment = incoming.isAdjusted === true && typeof incoming.adjustedAt === "string";
        if (isExplicitAdjustment) {
          nextRecords[index] = { ...existing, ...incoming };
        } else {
          const merged = { ...existing };
          for (const [key, value] of Object.entries(incoming)) {
            if (value !== undefined && value !== null && value !== "") merged[key] = value;
          }
          nextRecords[index] = merged;
        }
      }

      await client.query(
        "UPDATE app_state SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{attendanceRecords}', $1::jsonb), updated_at = NOW() WHERE id = 'default'",
        [JSON.stringify(nextRecords)]
      );
      await client.query("COMMIT");
      const savedRecord = index < 0 ? nextRecords[nextRecords.length - 1] : nextRecords[index];
      return Response.json({ success: true, record: savedRecord });
    }

    if (body.action === "delete") {
      if (typeof body.recordId !== "string") {
        await client.query("ROLLBACK");
        return Response.json({ error: "recordId is required." }, { status: 400 });
      }

      const nextRecords = records.filter((record) => record.id !== body.recordId);
      await client.query(
        "UPDATE app_state SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{attendanceRecords}', $1::jsonb), updated_at = NOW() WHERE id = 'default'",
        [JSON.stringify(nextRecords)]
      );
      await client.query("COMMIT");
      return Response.json({ success: true, recordId: body.recordId });
    }

    await client.query("ROLLBACK");
    return Response.json({ error: "Unsupported mutation action." }, { status: 400 });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
    console.error("Attendance mutation failed", error);
    return Response.json({ error: "Unable to persist attendance mutation." }, { status: 500 });
  } finally {
    client.release();
  }
};

export const config: Config = { path: "/api/attendance-mutation" };
