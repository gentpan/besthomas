/** Languages of the public site. Chinese lives at /, English at /en. Safe to import from client code. */

export const LANGS = ["zh", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "zh";

export const isLang = (value: unknown): value is Lang => value === "zh" || value === "en";

export const otherLang = (lang: Lang): Lang => (lang === "zh" ? "en" : "zh");

/** BCP 47 tags for lang attributes and hreflang. */
export const HTML_LANG: Record<Lang, string> = { zh: "zh-CN", en: "en" };

export const LANG_NAME: Record<Lang, string> = { zh: "中文", en: "English" };

export const homePath = (lang: Lang) => (lang === "zh" ? "/" : "/en");

export const postPath = (lang: Lang, slug: string) => (lang === "zh" ? `/${slug}` : `/en/${slug}`);

export const feedPath = (lang: Lang) => (lang === "zh" ? "/feed.xml" : "/en/feed.xml");

export const UI = {
  zh: {
    noPosts: "还没有文章。",
    older: "上一篇",
    newer: "下一篇",
    moreNav: "更多文章",
    socialNav: "社交链接",
    draft: "草稿 · 仅你可见",
    like: "喜欢",
    likeAria: (n: number) => `喜欢这篇文章，已有 ${n} 人喜欢`,
    likedAria: (n: number) => `已喜欢，共 ${n} 人喜欢。再点一次取消`,
    notFoundTitle: "页面不存在",
    notFoundBody: "这篇文章可能已经被删除，或者地址改了。",
    backHome: "回到首页",
    switchTo: "EN",
    switchAria: "Read in English",
  },
  en: {
    noPosts: "No posts yet.",
    older: "Previous",
    newer: "Next",
    moreNav: "More posts",
    socialNav: "Social links",
    draft: "Draft · only visible to you",
    like: "Like",
    likeAria: (n: number) => `Like this post. ${n} ${n === 1 ? "like" : "likes"} so far`,
    likedAria: (n: number) => `Liked. ${n} ${n === 1 ? "like" : "likes"}. Click again to undo`,
    notFoundTitle: "Page not found",
    notFoundBody: "This post may have been removed or moved.",
    backHome: "Back to home",
    switchTo: "中文",
    switchAria: "阅读中文版",
  },
} satisfies Record<Lang, Record<string, unknown>>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Article date line: "2026 年 10 月 19 日" / "October 19, 2026". */
export function formatLongDate(date: string, lang: Lang): string {
  const [y, m, d] = date.split("-").map(Number);
  return lang === "zh" ? `${y} 年 ${m} 月 ${d} 日` : `${MONTHS[m - 1]} ${d}, ${y}`;
}
