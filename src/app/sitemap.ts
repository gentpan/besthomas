import type { MetadataRoute } from "next";
import { homePath, postPath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/paths";
import { listPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPosts();
  const latest = (lang: "zh" | "en") => posts.find((p) => p.lang === lang)?.date;
  return [
    { url: SITE_URL, lastModified: latest("zh") },
    { url: `${SITE_URL}${homePath("en")}`, lastModified: latest("en") },
    ...posts.map((p) => ({ url: `${SITE_URL}${postPath(p.lang, p.slug)}`, lastModified: p.date })),
  ];
}
