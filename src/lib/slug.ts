import { pinyin } from "pinyin-pro";

export const SLUG_MAX = 80;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Paths used by the app itself; a post with one of these slugs would be unreachable. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "uploads",
  "feed",
  "feed.xml",
  "rss",
  "sitemap",
  "sitemap.xml",
  "robots",
  "robots.txt",
  "icon",
  "favicon",
  "login",
  "_next",
  "en",
  "zh",
]);

/** Returns an error message in Chinese, or null when the slug is usable. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "slug 不能为空";
  if (slug.length > SLUG_MAX) return `slug 最长 ${SLUG_MAX} 个字符`;
  if (!SLUG_RE.test(slug)) return "slug 只能用小写字母、数字和连字符（-），且不能以连字符开头或结尾";
  if (RESERVED_SLUGS.has(slug)) return `“${slug}” 是系统保留路径，请换一个`;
  return null;
}

/** Turn any text (Chinese included, via pinyin) into a URL slug. May return "". */
export function slugify(input: string): string {
  const text = /[㐀-鿿]/.test(input)
    ? pinyin(input, { toneType: "none", type: "array", nonZh: "consecutive" }).join(" ")
    : input;
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let i = 2; taken.has(slug) || RESERVED_SLUGS.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}
