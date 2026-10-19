import fs from "node:fs";
import { Readable } from "node:stream";
import { extOf, MIME_TYPES, resolveUpload } from "@/lib/uploads";

const notFound = () => new Response("Not found", { status: 404 });

/** Serve admin uploads from the data folder. Supports Range requests so videos can seek (Safari needs this). */
export async function GET(req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const file = resolveUpload((await ctx.params).path);
  const type = file && MIME_TYPES[extOf(file)];
  if (!file || !type) return notFound();

  let size: number;
  try {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) return notFound();
    size = stat.size;
  } catch {
    return notFound();
  }

  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  // SVGs can carry scripts; make sure they never run when opened directly.
  if (type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers });
}
