import type { Config } from "@netlify/functions";
import { db, getSessionUserId, hashPassword, json, normalizeLogin, normalizeMobile } from "../lib/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const actor = await getSessionUserId(req);
  if (!actor) return json({ error: "Unauthorized." }, 401);

  const stateRows = await db.sql<{ state: { users?: Array<{ id: string; role: string }> } }>`
    SELECT state FROM app_state WHERE id = 'default' LIMIT 1
  `;
  const actorRole = stateRows[0]?.state?.users?.find((user) => user.id === actor)?.role;
  if (actorRole !== "super_admin") return json({ error: "Only Super Admin can create or reset employee credentials." }, 403);

  const body = await req.json().catch(() => null);
  const userId = String(body?.userId || "");
  const employeeId = String(body?.employeeId || "");
  const temporaryPassword = String(body?.temporaryPassword || employeeId);
  const mobileNumber = String(body?.mobileNumber || "");
  const mobileLogin = mobileNumber ? normalizeMobile(mobileNumber) : null;

  if (!userId || !employeeId) return json({ error: "User ID and employee ID are required." }, 400);

  await db.sql`
    INSERT INTO auth_accounts (user_id, login_id, mobile_login, password_hash, must_change_password, is_active)
    VALUES (${userId}, ${normalizeLogin(employeeId)}, ${mobileLogin}, ${hashPassword(temporaryPassword)}, true, true)
    ON CONFLICT (user_id)
    DO UPDATE SET login_id = EXCLUDED.login_id, mobile_login = EXCLUDED.mobile_login, password_hash = EXCLUDED.password_hash,
      must_change_password = true, is_active = true, updated_at = NOW()
  `;

  return json({ success: true });
};

export const config: Config = { path: "/api/auth/provision" };
