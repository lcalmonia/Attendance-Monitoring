import type { Config } from "@netlify/functions";
import { db, getBearerToken, hashToken, json } from "../lib/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const token = getBearerToken(req);
  if (token) await db.sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(token)}`;
  return json({ success: true });
};

export const config: Config = { path: "/api/auth/logout" };
