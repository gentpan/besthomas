import "server-only";
import path from "node:path";

/** Root of all admin-managed content. Mount this as a volume in production. */
// The ignore comment keeps the bundler from tracing (and shipping) the whole project for this runtime path.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.CONTENT_DIR || path.join(process.cwd(), "data"));
export const POSTS_DIR = path.join(DATA_DIR, "posts");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const SITE_FILE = path.join(DATA_DIR, "site.json");
export const LIKES_FILE = path.join(DATA_DIR, "likes.json");
export const PASSKEYS_FILE = path.join(DATA_DIR, "passkeys.json");
export const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

export const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
export const SITE_TIMEZONE = process.env.SITE_TIMEZONE || "Asia/Shanghai";
