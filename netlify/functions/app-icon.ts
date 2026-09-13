import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

type AppStateRow = { state: unknown };

const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#2563eb"/><text x="256" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="260" font-weight="700" fill="white">W</text></svg>`;

export default async () => {
  try {
    const db = getDatabase();
    const rows = await db.sql<AppStateRow>`
      SELECT state FROM app_state WHERE id = 'default' LIMIT 1
    `;
    const state = rows[0]?.state as Record<string, unknown> | undefined;
    const settings = state?.systemSettings as Record<string, unknown> | undefined;
    const dataUrl = typeof settings?.appLogoDataUrl === "string" ? settings.appLogoDataUrl : "";

    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (match) {
      const mime = match[1];
      const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
      return new Response(bytes, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  } catch (error) {
    console.warn("Unable to load custom app icon", error);
  }

  return new Response(fallbackSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
};

export const config: Config = { path: "/api/app-icon" };
