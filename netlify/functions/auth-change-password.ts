import type { Config } from "@netlify/functions";
import { db, getSessionUserId, hashPassword, json, verifyPassword } from "../lib/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const userId = await getSessionUserId(req);
  if (!userId) return json({ error: "Unauthorized." }, 401);

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword || "");
  const newPassword = String(body?.newPassword || "");
  const rows = await db.sql<{ password_hash: string }>`
    SELECT password_hash FROM auth_accounts WHERE user_id = ${userId} LIMIT 1
  `;
  if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) {
    return json({ error: "Current password is incorrect." }, 400);
  }

  await db.sql`
    UPDATE auth_accounts
    SET password_hash = ${hashPassword(newPassword)}, must_change_password = false, updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  return json({ success: true });
};

export const config: Config = { path: "/api/auth/change-password" };
