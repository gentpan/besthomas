import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LikeButton } from "@/components/like-button";
import { isAdmin } from "@/lib/auth";
import { formatLongDate, homePath, otherLang, postPath, UI, type Lang } from "@/lib/i18n";
import { getLikes } from "@/lib/likes";
import { excerpt, renderMarkdown } from "@/lib/markdown";
import { delay } from "@/lib/motion";
import { getPost, listPosts, type Post } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";

/** A post visible to the current visitor (drafts only for the logged-in admin). */
async function load(lang: Lang, slug: string): Promise<Post | null> {
  const post = await getPost(lang, slug);
  if (!post || (post.draft && !(await isAdmin()))) return null;
  return post;
}

/** The same slug in the other language, if it is published. */
async function translationOf(post: Post): Promise<Post | null> {
  const other = await getPost(otherLang(post.lang), post.slug);
  return other && !other.draft ? other : null;
}

export async function postMetadata(lang: Lang, slug: string): Promise<Metadata> {
  const post = await load(lang, slug);
  if (!post) return {};
  const translation = await translationOf(post);
  const description = post.summary || excerpt(post.body);
  return {
    title: post.title,
    description,
    alternates: {
      canonical: postPath(lang, slug),
      languages: translation
        ? { [lang === "zh" ? "zh-CN" : "en"]: postPath(lang, slug), [lang === "zh" ? "en" : "zh-CN"]: postPath(translation.lang, slug) }
        : undefined,
    },
    openGraph: { title: post.title, description, type: "article", publishedTime: post.date, url: postPath(lang, slug) },
    twitter: { card: "summary_large_image", title: post.title, description },
    robots: post.draft ? { index: false } : undefined,
  };
}

export async function PostView({ lang, slug }: { lang: Lang; slug: string }) {
  const post = await load(lang, slug);
  if (!post) notFound();

  const [site, html, published, likes] = await Promise.all([
    getSiteSettings(),
    renderMarkdown(post.body),
    listPosts({ lang }),
    getLikes(post),
  ]);
  const t = UI[lang];
  // The list is newest first: "newer" is the previous entry, "older" the next one.
  const index = published.findIndex((p) => p.slug === post.slug);
  const newer = index > 0 ? published[index - 1] : null;
  const older = index >= 0 && index < published.length - 1 ? published[index + 1] : null;

  return (
    <main className="page">
      <article>
        <Link href={homePath(lang)} className="back-link rise" style={delay(60)}>
          <span aria-hidden="true">←</span> {site[lang].name}
        </Link>
        <h1 className="article-title rise" style={delay(120)}>
          {post.title}
        </h1>
        <p className="article-meta rise" style={delay(200)}>
          <time dateTime={post.date}>{formatLongDate(post.date, lang)}</time>
          {post.draft && <span className="draft-badge">{t.draft}</span>}
        </p>
        <div className="article-body prose rise" style={delay(320)} dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      {!post.draft && (
        <div className="like-wrap">
          <LikeButton lang={lang} slug={post.slug} initialCount={likes} />
        </div>
      )}

      {(newer || older) && (
        <nav className="post-nav" aria-label={t.moreNav}>
          {older && (
            <Link href={postPath(lang, older.slug)}>
              {t.older}
              <span>{older.title}</span>
            </Link>
          )}
          {newer && (
            <Link href={postPath(lang, newer.slug)} className="next">
              {t.newer}
              <span>{newer.title}</span>
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
