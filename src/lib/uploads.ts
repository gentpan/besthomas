import "server-only";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "./paths";
import { ContentError } from "./posts";
import { slugify } from "./slug";

export const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  pdf: "application/pdf",
};

const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_MEDIA = 100 * 1024 * 1024;

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Store an uploaded file under uploads/YYYY/MM/ with a random suffix; returns its public URL. */
export async function saveUpload(file: File): Promise<string> {
  const ext = extOf(file.name);
  const mime = MIME_TYPES[ext];
  if (!mime) throw new ContentError(`不支持的文件类型：.${ext || "?"}（支持 ${Object.keys(MIME_TYPES).join("、")}）`);
  const limit = mime.startsWith("image/") ? MAX_IMAGE : MAX_MEDIA;
  if (file.size > limit) throw new ContentError(`${file.name} 太大了，最大 ${limit / 1024 / 1024} MB`);

  const now = new Date();
  const dir = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const base = slugify(file.name.slice(0, -(ext.length + 1))).slice(0, 40) || "file";
  const name = `${base}-${randomBytes(4).toString("hex")}.${ext}`;
  await fs.mkdir(path.join(UPLOADS_DIR, dir), { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${dir.split(path.sep).join("/")}/${name}`;
}

/** Resolve a public /uploads path to a file on disk, refusing anything outside the uploads folder. */
export function resolveUpload(segments: string[]): string | null {
  const full = path.resolve(UPLOADS_DIR, ...segments);
  return full.startsWith(UPLOADS_DIR + path.sep) ? full : null;
}
