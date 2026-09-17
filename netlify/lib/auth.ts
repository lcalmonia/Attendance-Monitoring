import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@netlify/database";

export const db = getDatabase();

export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
  minimumLength = 8
) {
  if (password.length < minimumLength) {
    throw new Error(`Password must be at least ${minimumLength} characters.`);
  }
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, salt, expectedHex] = String(stored || "").split(":");

    // All WorkSphere-generated hashes use a 16-byte salt and a 64-byte
    // scrypt result. Reject malformed/unbounded values before calling
    // scryptSync so a bad stored hash can never force an oversized CPU/memory
    // operation and make the login function appear to hang.
    if (
      algorithm !== "scrypt" ||
      !/^[0-9a-f]{32}$/i.test(salt || "") ||
      !/^[0-9a-f]{128}$/i.test(expectedHex || "")
    ) {
      return false;
    }

    const expected = Buffer.from(expectedHex, "hex");
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getBearerToken(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function getSessionUserId(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await db.sql<{ user_id: string }>`
    SELECT user_id FROM auth_sessions
    WHERE token_hash = ${tokenHash} AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0]?.user_id || null;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
