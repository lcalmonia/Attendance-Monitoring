import type { Config } from "@netlify/functions";
import { db, hashPassword, json, normalizeLogin } from "../lib/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "Invalid request." }, 400);

  const fullName = String(body.fullName || "").trim();
  const employeeId = String(body.employeeId || "").trim();
  const email = String(body.email || "").trim();
  const mobileNumber = String(body.mobileNumber || "").trim();
  const password = String(body.password || "");

  if (!fullName || !employeeId || !password) {
    return json({ error: "Name, employee ID, and password are required." }, 400);
  }

  const existing = await db.sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM auth_accounts`;
  if (Number(existing[0]?.count || 0) > 0) {
    return json({ error: "Initial setup has already been completed." }, 403);
  }

  const userId = `usr_${crypto.randomUUID()}`;
  const loginId = normalizeLogin(employeeId);

  await db.sql`
    INSERT INTO auth_accounts (user_id, login_id, password_hash, must_change_password, is_active)
    VALUES (${userId}, ${loginId}, ${hashPassword(password)}, false, true)
  `;

  const user = {
    id: userId,
    employeeId,
    fullName,
    email,
    mobileNumber,
    role: "super_admin",
    businessId: "all",
    status: "active",
  };

  const userJson = JSON.stringify(user);
  await db.sql`
    UPDATE app_state
    SET state = state || jsonb_build_object(
      'users',
      COALESCE(state->'users', '[]'::jsonb) || jsonb_build_array(${userJson}::jsonb)
    ),
    updated_at = NOW()
    WHERE id = 'default'
  `;

  return json({ success: true, user });
};

export const config: Config = { path: "/api/auth/setup", rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
