import type { Config } from "@netlify/functions";
import { db, json } from "../lib/auth";

export default async () => {
  const rows = await db.sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM auth_accounts`;
  return json({ hasAccounts: Number(rows[0]?.count || 0) > 0 });
};

export const config: Config = { path: "/api/auth/status" };
