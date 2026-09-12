import type { Config } from "@netlify/functions";
import { db, getSessionUserId, json } from "../lib/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const actor = await getSessionUserId(req);
  if (!actor) return json({ error: "Unauthorized." }, 401);

  const body = await req.json().catch(() => null);
  const userId = String(body?.userId || "");
  if (!userId) return json({ error: "Employee ID is required." }, 400);
  if (userId === actor) return json({ error: "You cannot delete the account currently signed in." }, 400);

  const stateRows = await db.sql<{ state: { users?: Array<{ id: string; role: string }> } }>`
    SELECT state FROM app_state WHERE id = 'default' LIMIT 1
  `;
  const users = stateRows[0]?.state?.users || [];
  const actorRole = users.find((user) => user.id === actor)?.role;
  if (actorRole !== "super_admin") return json({ error: "Only Super Admin can delete employee accounts." }, 403);

  await db.sql`DELETE FROM auth_accounts WHERE user_id = ${userId}`;
  return json({ success: true });
};

export const config: Config = { path: "/api/auth/delete" };
