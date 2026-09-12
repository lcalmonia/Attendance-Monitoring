import type { Config } from "@netlify/functions";
import { db, getSessionUserId, json, normalizeLogin, normalizeMobile } from "../lib/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const actor = await getSessionUserId(req);
  if (!actor) return json({ error: "Unauthorized." }, 401);

  const body = await req.json().catch(() => null);
  const userId = String(body?.userId || "");
  const employeeId = String(body?.employeeId || "");
  const mobileNumber = String(body?.mobileNumber || "");
  if (!userId || !employeeId) return json({ error: "User ID and employee ID are required." }, 400);

  const stateRows = await db.sql<{ state: { users?: Array<{ id: string; role: string }> } }>`
    SELECT state FROM app_state WHERE id = 'default' LIMIT 1
  `;
  const actorRole = stateRows[0]?.state?.users?.find((user) => user.id === actor)?.role;
  if (actorRole !== "super_admin") return json({ error: "Only Super Admin can update employee login identifiers." }, 403);

  await db.sql`
    UPDATE auth_accounts
    SET login_id = ${normalizeLogin(employeeId)},
        mobile_login = ${mobileNumber ? normalizeMobile(mobileNumber) : null},
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  return json({ success: true });
};

export const config: Config = { path: "/api/auth/sync-login" };
