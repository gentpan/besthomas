import type { MetadataRoute } from "next";
import { homePath, postPath, projectsPath } from "@/lib/i18n";
import { SITE_URL } from "@/lib/paths";
import { listPosts } from "@/lib/posts";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([listPosts(), listProjects("zh")]);
  const latest = (lang: "zh" | "en") => posts.find((p) => p.lang === lang)?.date;
  return [
    { url: SITE_URL, lastModified: latest("zh") },
    { url: `${SITE_URL}${homePath("en")}`, lastModified: latest("en") },
    ...(projects.items.length > 0
      ? [{ url: `${SITE_URL}${projectsPath("zh")}` }, { url: `${SITE_URL}${projectsPath("en")}` }]
      : []),
    ...posts.map((p) => ({ url: `${SITE_URL}${postPath(p.lang, p.slug)}`, lastModified: p.date })),
  ];
}
