import type { Metadata } from "next";
import Link from "next/link";
import { formatListDate } from "@/lib/dates";
import { feedPath, homePath, postPath, UI, type Lang } from "@/lib/i18n";
import { renderMarkdown } from "@/lib/markdown";
import { delay } from "@/lib/motion";
import { listPosts } from "@/lib/posts";
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
  const [site, posts] = await Promise.all([getSiteSettings(), listPosts({ lang })]);
  const { name, intro } = site[lang];
  const introHtml = await renderMarkdown(intro);

  return (
    <main className="page home-page">
      <h1 className="home-name rise" style={delay(120)}>
        {name}
      </h1>

      {intro && <div className="intro rise" style={delay(260)} dangerouslySetInnerHTML={{ __html: introHtml }} />}

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
          {UI[lang].noPosts}
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
