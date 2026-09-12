import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const store = getStore("worksphere-uploads", { consistency: "strong" });

export default async (req: Request) => {
  if (req.method === "POST") {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "A file is required." }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json({ error: "File exceeds the 10 MB upload limit." }, { status: 413 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    await store.set(key, file.stream(), {
      metadata: {
        contentType: file.type || "application/octet-stream",
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    return Response.json({ key, fileName: file.name, contentType: file.type });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");

    if (!key || !key.startsWith("uploads/")) {
      return Response.json({ error: "A valid upload key is required." }, { status: 400 });
    }

    const result = await store.getWithMetadata(key, { type: "stream", consistency: "strong" });
    if (!result) return new Response("Not Found", { status: 404 });

    return new Response(result.data, {
      headers: {
        "Content-Type": result.metadata?.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${result.metadata?.originalName || "file"}"`,
      },
    });
  }

  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, POST" } });
};

export const config: Config = { path: "/api/uploads" };
