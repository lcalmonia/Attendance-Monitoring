import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const url = new URL(req.url);
  const icon = `${url.origin}/api/app-icon`;

  return new Response(JSON.stringify({
    name: "WorkSphere – CV Group Attendance & Payroll",
    short_name: "WorkSphere",
    description: "CV Group of Companies Attendance & Payroll System",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  }), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
};

export const config: Config = { path: "/api/manifest.webmanifest" };
