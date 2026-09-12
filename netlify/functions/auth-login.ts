import type { Config } from "@netlify/functions";
import { db, createSessionToken, hashToken, json, normalizeLogin, verifyPassword } from "../lib/auth";

type Account = { user_id: string; password_hash: string; must_change_password: boolean; is_active: boolean };

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const body = await req.json().catch(() => null);
  const loginId = normalizeLogin(String(body?.loginId || ""));
  const password = String(body?.password || "");

  if (!loginId || !password) return json({ error: "Employee ID and password are required." }, 400);

  const rows = await db.sql<Account>`
    SELECT user_id, password_hash, must_change_password, is_active
    FROM auth_accounts WHERE login_id = ${loginId} LIMIT 1
  `;
  const account = rows[0];

  if (!account || !account.is_active || !verifyPassword(password, account.password_hash)) {
    return json({ error: "Invalid credentials." }, 401);
  }

  const token = createSessionToken();
  await db.sql`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${account.user_id}, NOW() + INTERVAL '7 days')
  `;

  return json({ token, userId: account.user_id, mustChangePassword: account.must_change_password });
};

export const config: Config = { path: "/api/auth/login", rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip"] } };
