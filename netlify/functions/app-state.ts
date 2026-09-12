import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getSessionUserId } from "../lib/auth";

type AppStateRow = { state: unknown; updated_at: string };

export default async (req: Request) => {
  const userId = await getSessionUserId(req);
  if (!userId) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const db = getDatabase();

  if (req.method === "GET") {
    const rows = await db.sql<AppStateRow>`
      SELECT state, updated_at
      FROM app_state
      WHERE id = 'default'
      LIMIT 1
    `;

    const row = rows[0];
    return Response.json({ state: row?.state ?? {}, updatedAt: row?.updated_at ?? null });
  }

  if (req.method === "PUT") {
    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "State must be a JSON object." }, { status: 400 });
    }

    await db.sql`
      INSERT INTO app_state (id, state, updated_at)
      VALUES ('default', ${JSON.stringify(body)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
    `;

    return Response.json({ success: true });
  }

  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, PUT" } });
};

export const config: Config = { path: "/api/app-state" };
