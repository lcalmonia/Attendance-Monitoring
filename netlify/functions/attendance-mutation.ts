import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getSessionUserId } from "../lib/auth";

type State = Record<string, unknown>;
type RecordValue = Record<string, unknown>;

type AppUser = {
  id?: string;
  role?: string;
  businessId?: string;
};

const asState = (value: unknown): State =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as State
    : {};

const asRecords = (value: unknown): RecordValue[] =>
  Array.isArray(value)
    ? value.filter((item): item is RecordValue => !!item && typeof item === "object" && !Array.isArray(item))
    : [];

const mergeAttendanceRecord = (current: RecordValue | undefined, incoming: RecordValue): RecordValue => {
  if (!current) return { ...incoming };

  const isExplicitAdjustment = incoming.isAdjusted === true && typeof incoming.adjustedAt === "string";
  if (isExplicitAdjustment) return { ...current, ...incoming };

  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null && value !== "") merged[key] = value;
  }
  return merged;
};

const findUser = (state: State, userId: string): AppUser | undefined => {
  const users = Array.isArray(state.users) ? state.users : [];
  const found = users.find((item) => item && typeof item === "object" && (item as AppUser).id === userId);
  return found as AppUser | undefined;
};

const canManageEmployeeRecord = (user: AppUser, record: RecordValue): boolean => {
  if (user.role === "super_admin") return true;
  if (user.role !== "business_admin") return false;
  return user.businessId === record.businessId;
};

export default async (req: Request) => {
  const userId = await getSessionUserId(req);
  if (!userId) return Response.json({ error: "Unauthorized." }, { status: 401 });

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") {
    return Response.json({ error: "A mutation action is required." }, { status: 400 });
  }

  const db = getDatabase();
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO app_state (id, state, updated_at) VALUES ('default', '{}'::jsonb, NOW()) ON CONFLICT (id) DO NOTHING"
    );

    // Lock the single shared app_state row for the complete read/merge/write
    // operation. This is what makes simultaneous clock-ins from different
    // devices atomic instead of last-write-wins on stale attendance arrays.
    const result = await client.query<{ state: unknown }>(
      "SELECT state FROM app_state WHERE id = 'default' FOR UPDATE"
    );
    const state = asState(result.rows[0]?.state);
    const user = findUser(state, userId);
    if (!user) {
      await client.query("ROLLBACK");
      return Response.json({ error: "User account was not found." }, { status: 403 });
    }

    if (body.action === "upsert") {
      if (!body.record || typeof body.record !== "object" || Array.isArray(body.record)) {
        await client.query("ROLLBACK");
        return Response.json({ error: "A valid attendance record is required." }, { status: 400 });
      }

      const incoming = body.record as RecordValue;
      if (
        typeof incoming.id !== "string" ||
        typeof incoming.employeeId !== "string" ||
        typeof incoming.businessId !== "string"
      ) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Attendance record is missing required identity fields." }, { status: 400 });
      }

      const source = body.source === "admin" ? "admin" : "clock";
      if (source === "clock") {
        if (user.role !== "employee" || incoming.employeeId !== userId || incoming.businessId !== user.businessId) {
          await client.query("ROLLBACK");
          return Response.json({ error: "Employees may only record their own attendance." }, { status: 403 });
        }
      } else if (!canManageEmployeeRecord(user, incoming)) {
        await client.query("ROLLBACK");
        return Response.json({ error: "You are not authorized to modify this attendance record." }, { status: 403 });
      }

      const records = asRecords(state.attendanceRecords);
      const index = records.findIndex((record) => record.id === incoming.id);
      const nextRecords = [...records];
      const nextRecord = mergeAttendanceRecord(index < 0 ? undefined : records[index], incoming);
      if (index < 0) nextRecords.push(nextRecord);
      else nextRecords[index] = nextRecord;

      await client.query(
        `UPDATE app_state
         SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{attendanceRecords}', $1::jsonb),
             updated_at = NOW()
         WHERE id = 'default'`,
        [JSON.stringify(nextRecords)]
      );

      await client.query("COMMIT");
      return Response.json({ success: true, record: nextRecord });
    }

    if (body.action === "delete") {
      if (typeof body.recordId !== "string") {
        await client.query("ROLLBACK");
        return Response.json({ error: "recordId is required." }, { status: 400 });
      }
      if (user.role !== "super_admin" && user.role !== "business_admin") {
        await client.query("ROLLBACK");
        return Response.json({ error: "Only authorized administrators may delete attendance." }, { status: 403 });
      }

      const records = asRecords(state.attendanceRecords);
      const current = records.find((record) => record.id === body.recordId);
      if (!current) {
        await client.query("COMMIT");
        return Response.json({ success: true, recordId: body.recordId, deleted: false });
      }
      if (!canManageEmployeeRecord(user, current)) {
        await client.query("ROLLBACK");
        return Response.json({ error: "You are not authorized to delete this attendance record." }, { status: 403 });
      }

      const nextRecords = records.filter((record) => record.id !== body.recordId);
      await client.query(
        `UPDATE app_state
         SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{attendanceRecords}', $1::jsonb),
             updated_at = NOW()
         WHERE id = 'default'`,
        [JSON.stringify(nextRecords)]
      );

      await client.query("COMMIT");
      return Response.json({ success: true, recordId: body.recordId, deleted: true });
    }

    await client.query("ROLLBACK");
    return Response.json({ error: "Unsupported mutation action." }, { status: 400 });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
    console.error("Attendance mutation failed", error);
    return Response.json({ error: "Attendance mutation failed." }, { status: 500 });
  } finally {
    client.release();
  }
};

export const config: Config = {
  path: "/api/attendance-mutation",
};
