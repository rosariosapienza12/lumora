import { db } from "@/lib/db";

/** Serves an uploaded image. Nothing here can run as a page: no sniffing, sandboxed, no scripts. */
export async function GET(_request: Request, { params }: RouteContext<"/a/[id]">) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) return new Response("Not found", { status: 404 });

  const asset = await db.asset.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(asset.data), {
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(asset.data.length),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
      // Content never changes for a given id.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
