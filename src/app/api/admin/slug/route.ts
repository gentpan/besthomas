import { adminRoute, json, readJson } from "@/lib/api";
import { isLang, type Lang } from "@/lib/i18n";
import { listSlugs, type PostRef } from "@/lib/posts";
import { slugify, uniqueSlug, validateSlug } from "@/lib/slug";

/**
 * Two uses, both within one language:
 *  - { lang, title }          → suggest a free slug generated from the title (pinyin for Chinese)
 *  - { lang, slug, current }  → check a hand-written slug; `current` is the post being edited (its own slug is fine)
 */
export const POST = adminRoute(async (req) => {
  const body = await readJson<{ lang?: Lang; title?: string; slug?: string; current?: PostRef }>(req);
  const lang: Lang = isLang(body.lang) ? body.lang : "zh";
  const taken = await listSlugs(lang);
  if (body.current?.lang === lang) taken.delete(body.current.slug);

  if (typeof body.slug === "string") {
    const label = lang === "zh" ? "中文" : "英文";
    const error = validateSlug(body.slug) ?? (taken.has(body.slug) ? `${label}文章里已经有 “${body.slug}” 了` : null);
    return json({ slug: body.slug, error });
  }
  const base = slugify(String(body.title ?? "")) || "post";
  return json({ slug: uniqueSlug(base, taken), error: null });
});
