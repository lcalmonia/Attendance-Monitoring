import type { Config } from "@netlify/functions";
import { db, createSessionToken, hashToken, json, normalizeLogin, normalizeMobile, verifyPassword } from "../lib/auth";

type Account = { user_id: string; password_hash: string; must_change_password: boolean; is_active: boolean };

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const body = await req.json().catch(() => null);
  const rawLogin = String(body?.loginId || "");
  const loginId = normalizeLogin(rawLogin);
  const mobileLogin = normalizeMobile(rawLogin);
  const password = String(body?.password || "");

  if (!loginId || !password) return json({ error: "Employee ID or mobile number and password are required." }, 400);

  // Look up by employee ID first. This only depends on the original auth schema.
  let account = (await db.sql<Account>`
    SELECT user_id, password_hash, must_change_password, is_active
    FROM auth_accounts
    WHERE login_id = ${loginId}
    LIMIT 1
  `)[0];

  // Older deploy-preview databases may not yet have migration 0003's
  // mobile_login column. Fall back to the user's mobile number in app_state
  // so mobile login remains compatible without referencing that column.
  if (!account && mobileLogin.length >= 10) {
    account = (await db.sql<Account>`
      SELECT account.user_id, account.password_hash, account.must_change_password, account.is_active
      FROM auth_accounts AS account
      JOIN app_state AS state_row ON state_row.id = 'default'
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(state_row.state->'users', '[]'::jsonb)) AS user_data(value)
      WHERE account.user_id = user_data.value->>'id'
        AND RIGHT(REGEXP_REPLACE(COALESCE(user_data.value->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${mobileLogin}
      LIMIT 1
    `)[0];
  }

  const passwordToVerify = account?.must_change_password ? normalizeLogin(password) : password;
  if (!account || !account.is_active || !verifyPassword(passwordToVerify, account.password_hash)) {
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
