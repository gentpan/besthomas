import "server-only";
import { HTML_LANG, homePath, postPath, type Lang } from "./i18n";
import { excerpt } from "./markdown";
import { SITE_URL } from "./paths";
import { listPosts } from "./posts";
import { getSiteSettings } from "./site";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of the latest published posts in one language. */
export async function feedResponse(lang: Lang): Promise<Response> {
  const [site, posts] = await Promise.all([getSiteSettings(), listPosts({ lang })]);
  const items = posts
    .slice(0, 50)
    .map((p) => {
      const url = `${SITE_URL}${postPath(lang, p.slug)}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00+08:00`).toUTCString()}</pubDate>
      <description>${esc(p.summary || excerpt(p.body, 200))}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(site[lang].name)}</title>
    <link>${SITE_URL}${homePath(lang) === "/" ? "" : homePath(lang)}</link>
    <description>${esc(site[lang].description)}</description>
    <language>${HTML_LANG[lang]}</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
