import Link from "next/link";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import { cardCls, primaryBtn, secondaryBtn } from "@/components/admin/ui";
import { formatListDate } from "@/lib/dates";
import { isLang, LANG_NAME, LANGS, otherLang, postPath, type Lang } from "@/lib/i18n";
import { getAllLikes, likesFor } from "@/lib/likes";
import { listPosts } from "@/lib/posts";

const BADGE: Record<Lang, string> = { zh: "中", en: "EN" };

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin">) {
  const { lang } = await searchParams;
  const filter = isLang(lang) ? lang : null;
  const [all, likes] = await Promise.all([listPosts({ includeDrafts: true }), getAllLikes()]);
  const posts = filter ? all.filter((p) => p.lang === filter) : all;
  const existing = new Set(all.map((p) => `${p.lang}/${p.slug}`));
  const drafts = posts.filter((p) => p.draft).length;

  const tabs: { label: string; href: string; active: boolean; count: number }[] = [
    { label: "全部", href: "/admin", active: !filter, count: all.length },
    ...LANGS.map((l) => ({
      label: LANG_NAME[l],
      href: `/admin?lang=${l}`,
      active: filter === l,
      count: all.filter((p) => p.lang === l).length,
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[28px] leading-tight text-stone-700 dark:text-zinc-200">文章</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-500">
            共 {posts.length} 篇{drafts > 0 && `，其中 ${drafts} 篇草稿`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/posts/new${filter ? `?lang=${filter}` : ""}`} className={secondaryBtn}>
            新建文章
          </Link>
          <Link href="/admin/import" className={primaryBtn}>
            上传 Markdown
          </Link>
        </div>
      </div>

      <nav className="mt-6 flex gap-1" aria-label="按语言筛选">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              t.active
                ? "bg-stone-200/70 font-medium text-stone-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-stone-400 tabular-nums dark:text-zinc-500">{t.count}</span>
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <div className={`${cardCls} mt-4 px-6 py-16 text-center`}>
          <p className="text-stone-500 dark:text-zinc-400">还没有文章。</p>
          <Link href="/admin/import" className={`${primaryBtn} mt-4`}>
            上传第一篇 Markdown
          </Link>
        </div>
      ) : (
        <div className={`${cardCls} mt-4 overflow-hidden`}>
          <ul className="divide-y divide-stone-200 dark:divide-zinc-800">
            {posts.map((post) => {
              const edit = `/admin/posts/${post.lang}/${post.slug}`;
              const other = otherLang(post.lang);
              const count = likesFor(likes, post);
              return (
                <li key={`${post.lang}/${post.slug}`} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <span
                    className="w-7 shrink-0 rounded bg-stone-100 py-0.5 text-center text-[11px] font-medium text-stone-500 dark:bg-zinc-800 dark:text-zinc-400"
                    title={LANG_NAME[post.lang]}
                  >
                    {BADGE[post.lang]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={edit}
                      className="font-serif text-[17px] text-stone-800 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-400"
                    >
                      {post.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-stone-500 dark:text-zinc-500">
                      <span className="tabular-nums">{formatListDate(post.date, "full")}</span>
                      <a
                        href={postPath(post.lang, post.slug)}
                        target="_blank"
                        className="font-mono hover:text-stone-800 dark:hover:text-zinc-200"
                      >
                        {postPath(post.lang, post.slug)}
                      </a>
                      {count > 0 && (
                        <span className="text-rose-600/80 tabular-nums dark:text-rose-400/80" title="点赞数">
                          ♥ {count}
                        </span>
                      )}
                      {existing.has(`${other}/${post.slug}`) ? (
                        <Link href={`/admin/posts/${other}/${post.slug}`} className="hover:text-stone-800 dark:hover:text-zinc-200">
                          ↔ {LANG_NAME[other]}版
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/posts/new?lang=${other}&slug=${post.slug}`}
                          className="text-stone-400 hover:text-stone-800 dark:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          + {LANG_NAME[other]}版
                        </Link>
                      )}
                      {post.draft && (
                        <span className="rounded bg-amber-100 px-1.5 py-px text-[12px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          草稿
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={edit} className="text-sm text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                    编辑
                  </Link>
                  <DeletePostButton lang={post.lang} slug={post.slug} title={post.title} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
