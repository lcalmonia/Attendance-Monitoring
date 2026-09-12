import type { Config } from "@netlify/functions";
import { db, getSessionUserId, json } from "../lib/auth";

export default async (req: Request) => {
  const userId = await getSessionUserId(req);
  if (!userId) return json({ authenticated: false }, 401);
  const rows = await db.sql<{ must_change_password: boolean }>`
    SELECT must_change_password FROM auth_accounts WHERE user_id = ${userId} LIMIT 1
  `;
  return json({ authenticated: true, userId, mustChangePassword: rows[0]?.must_change_password ?? false });
};

export const config: Config = { path: "/api/auth/session" };
