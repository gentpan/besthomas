import type { Metadata } from "next";
import Link from "next/link";
import { formatListDate } from "@/lib/dates";
import { feedPath, homePath, postPath, projectsPath, UI, type Lang } from "@/lib/i18n";
import { renderMarkdown } from "@/lib/markdown";
import { delay } from "@/lib/motion";
import { listPosts } from "@/lib/posts";
import { listProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site";

export async function homeMetadata(lang: Lang): Promise<Metadata> {
  const site = await getSiteSettings();
  const { name, description } = site[lang];
  return {
    title: { absolute: name },
    description,
    openGraph: { title: name, description, url: homePath(lang), type: "website", siteName: name },
    twitter: { card: "summary_large_image", title: name, description },
    alternates: {
      canonical: homePath(lang),
      languages: { "zh-CN": homePath("zh"), en: homePath("en") },
      types: { "application/rss+xml": feedPath(lang) },
    },
  };
}

export async function HomeView({ lang }: { lang: Lang }) {
  const [site, posts, projects] = await Promise.all([getSiteSettings(), listPosts({ lang }), listProjects(lang)]);
  const { name, intro } = site[lang];
  const t = UI[lang];
  const introHtml = await renderMarkdown(intro);

  return (
    <main className="page home-page">
      <h1 className="home-name rise" style={delay(120)}>
        {name}
      </h1>

      {intro && <div className="intro rise" style={delay(260)} dangerouslySetInnerHTML={{ __html: introHtml }} />}

      {/* Header for the list below, and the way to the projects page (only once there are projects to show). */}
      {projects.items.length > 0 && (
        <nav className="section-nav rise" style={delay(400)} aria-label={t.sections}>
          <Link href={homePath(lang)} aria-current="page">
            {t.posts}
          </Link>
          <Link href={projectsPath(lang)}>{t.projects}</Link>
        </nav>
      )}

      {posts.length > 0 ? (
        <ul className="post-list">
          {posts.map((post, i) => (
            <li key={post.slug} className="rise" style={delay(480 + Math.min(i, 12) * 40)}>
              <Link href={postPath(lang, post.slug)} className="post-row">
                <span className="post-title">{post.title}</span>
                <span className="post-leader" aria-hidden="true" />
                <time className="post-date" dateTime={post.date}>
                  {formatListDate(post.date, site.listDate)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-note rise" style={delay(480)}>
          {t.noPosts}
        </p>
      )}

      <div className="stars rise" style={delay(700)} aria-hidden="true">
        <span>*</span>
        <span>*</span>
        <span>*</span>
      </div>
    </main>
  );
}
