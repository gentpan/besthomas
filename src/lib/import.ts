import "server-only";
import { normalizeDate, today } from "./dates";
import { parseFrontmatter } from "./frontmatter";
import type { Lang } from "./i18n";
import { SITE_TIMEZONE } from "./paths";
import { slugify, uniqueSlug, validateSlug } from "./slug";

export type Detected = {
  lang: Lang;
  title: string;
  slug: string;
  date: string;
  summary: string;
  draft: boolean;
  body: string;
  /** Where each field came from, shown to the admin so the guess is easy to check. */
  sources: { lang: string; title: string; slug: string; date: string };
  warnings: string[];
};

const GENERIC_NAMES = new Set(["readme", "index", "untitled", "document", "note", "draft", "post", "new", "article"]);

function pick(data: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (data[k] !== undefined && data[k] !== null && data[k] !== "") return data[k];
  return undefined;
}

/** Language from a front matter value such as "en", "en-US", "zh-CN" or "中文". */
function langFromValue(value: unknown): Lang | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (/^(zh|cn|chinese|中文)/.test(v)) return "zh";
  if (/^(en|english|英文)/.test(v)) return "en";
  return null;
}

/** Guess the language from the text: Chinese characters vs. Latin words (code, links and HTML ignored). */
function langFromText(text: string): Lang {
  const prose = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, " ");
  const cjk = (prose.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinWords = (prose.match(/[A-Za-z]+/g) ?? []).length;
  return cjk === 0 && latinWords > 0 ? "en" : cjk >= latinWords ? "zh" : "en";
}

/** Remove a leading `# Title` (or Setext `Title\n===`) line; returns the heading text if there was one. */
function takeLeadingH1(body: string): { heading: string | null; rest: string } {
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  const atx = /^#\s+(.+?)\s*#*\s*$/.exec(lines[i] ?? "");
  if (atx) return { heading: atx[1].trim(), rest: lines.slice(i + 1).join("\n").replace(/^\n+/, "") };
  if (lines[i]?.trim() && /^=+\s*$/.test(lines[i + 1] ?? "")) {
    return { heading: lines[i].trim(), rest: lines.slice(i + 2).join("\n").replace(/^\n+/, "") };
  }
  return { heading: null, rest: body };
}

const stripInline = (s: string) =>
  s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();

/** Point image references at uploaded files (matched by file name) and report the ones still missing. */
function rewriteImages(body: string, images: Record<string, string>): { body: string; missing: string[] } {
  const byName = new Map(Object.entries(images).map(([name, url]) => [name.toLowerCase(), url]));
  const resolve = (ref: string) => {
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    return byName.get(clean.split("/").pop()!.toLowerCase());
  };
  const isLocal = (ref: string) => !/^(https?:|data:|\/\/|\/uploads\/|#)/i.test(ref);
  const missing = new Set<string>();

  const note = (ref: string) => {
    if (isLocal(ref)) missing.add(ref);
    return ref;
  };

  let out = body
    // Obsidian: ![[name.png]] or ![[name.png|300]]
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (all, ref: string) => {
      const url = resolve(ref.trim());
      if (url) return `![](${url})`;
      missing.add(ref.trim());
      return all;
    })
    // Markdown: ![alt](path "title") and ![alt](<path with spaces>)
    .replace(/(!\[[^\]]*\]\()\s*(<[^>]+>|[^)\s]+)([^)]*\))/g, (all, start: string, ref: string, end: string) => {
      const target = ref.startsWith("<") ? ref.slice(1, -1) : ref;
      const url = resolve(target);
      return url ? `${start}${url}${end}` : (note(target), all);
    });
  // HTML: <img src="path">
  out = out.replace(/(<img\b[^>]*?\bsrc=["'])([^"']+)(["'])/gi, (all, start: string, ref: string, end: string) => {
    const url = resolve(ref);
    return url ? `${start}${url}${end}` : (note(ref), all);
  });
  return { body: out, missing: [...missing] };
}

/**
 * Guess title, slug, date and summary for an uploaded Markdown file.
 * Order of preference: front matter → content (first `# heading`) → file name → defaults.
 */
export function detectPost(
  raw: string,
  filename: string,
  opts: { taken: Record<Lang, Set<string>>; images?: Record<string, string> },
): Detected {
  const warnings: string[] = [];
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  let data: Record<string, unknown> = {};
  let body = text;
  try {
    ({ data, content: body } = parseFrontmatter(text));
  } catch {
    warnings.push("文件开头的 front matter 格式有误，已当作正文处理");
  }

  let base = filename
    .replace(/\.(md|markdown|mdx|txt)$/i, "")
    .replace(/\s+[0-9a-f]{32}$/i, "") // Notion exports append a 32-char id
    .trim();
  // "hello.en.md" / "hello.zh.md": language suffix in the file name.
  const nameLangMatch = /[._-](en|zh|zh-cn)$/i.exec(base);
  const nameLang = nameLangMatch ? langFromValue(nameLangMatch[1]) : null;
  if (nameLangMatch) base = base.slice(0, nameLangMatch.index);
  const nameMatch = /^(\d{4}-\d{1,2}-\d{1,2})[\s_-]*(.*)$/.exec(base);
  const nameDate = nameMatch ? normalizeDate(nameMatch[1]) : null;
  const nameRest = (nameMatch ? nameMatch[2] : base).trim();

  // Title
  const fmTitle = pick(data, ["title", "Title", "name", "标题"]);
  const { heading, rest } = takeLeadingH1(body);
  let title: string;
  let titleSource: string;
  if (typeof fmTitle === "string" || typeof fmTitle === "number") {
    title = String(fmTitle).trim();
    titleSource = "front matter";
    // Drop a duplicate H1 so the title is not printed twice.
    if (heading && stripInline(heading) === title) body = rest;
  } else if (heading) {
    title = stripInline(heading);
    titleSource = "正文第一行标题";
    body = rest;
  } else {
    title = nameRest || base || "未命名";
    titleSource = "文件名";
  }

  // Date
  const fmDate = normalizeDate(pick(data, ["date", "pubDate", "publishDate", "published", "created", "date_created", "日期"]));
  let date: string;
  let dateSource: string;
  if (fmDate) {
    date = fmDate;
    dateSource = "front matter";
  } else if (nameDate) {
    date = nameDate;
    dateSource = "文件名";
  } else {
    date = today(SITE_TIMEZONE);
    dateSource = "今天（文件里没有日期）";
  }

  // Language
  const fmLang = langFromValue(pick(data, ["lang", "language", "locale", "语言"]));
  const lang: Lang = fmLang ?? nameLang ?? langFromText(`${title}\n${body}`);
  const langSource = fmLang ? "front matter" : nameLang ? "文件名" : "正文内容";

  // Slug
  let slugSource: string;
  let slug = "";
  const fmSlug = pick(data, ["slug", "permalink", "url"]);
  if (typeof fmSlug === "string" && slugify(fmSlug.split("/").filter(Boolean).pop() ?? "")) {
    slug = slugify(fmSlug.split("/").filter(Boolean).pop()!);
    slugSource = "front matter";
  } else if (/^[\x20-\x7e]+$/.test(nameRest) && slugify(nameRest) && !GENERIC_NAMES.has(slugify(nameRest))) {
    slug = slugify(nameRest);
    slugSource = "文件名";
  } else if (slugify(title)) {
    slug = slugify(title);
    slugSource = /[㐀-鿿]/.test(title) ? "标题拼音" : "标题";
  } else {
    slug = `post-${date.replaceAll("-", "")}`;
    slugSource = "日期";
  }
  if (validateSlug(slug)) slug = `post-${slug}`.slice(0, 60).replace(/-+$/, "");
  const unique = uniqueSlug(slug, opts.taken[lang]);
  if (unique !== slug) warnings.push(`${lang === "zh" ? "中文" : "英文"}文章里已有 slug “${slug}”，已改为 “${unique}”`);
  slug = unique;

  // Summary and draft flag
  const fmSummary = pick(data, ["summary", "description", "excerpt", "abstract", "摘要"]);
  const summary = typeof fmSummary === "string" ? fmSummary.trim() : "";
  const draft =
    data.draft === true || data.published === false || String(data.status ?? "").toLowerCase() === "draft";

  // Images
  const images = rewriteImages(body, opts.images ?? {});
  body = images.body;
  if (images.missing.length) {
    warnings.push(`有 ${images.missing.length} 张图片没找到：${images.missing.slice(0, 5).join("、")}${images.missing.length > 5 ? " 等" : ""}。可以把图片和 .md 一起拖进来，或保存后在编辑器里上传`);
  }

  return {
    lang,
    title,
    slug,
    date,
    summary,
    draft,
    body: body.replace(/^\n+/, ""),
    sources: { lang: langSource, title: titleSource, slug: slugSource, date: dateSource },
    warnings,
  };
}
