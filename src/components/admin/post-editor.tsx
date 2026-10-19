"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HTML_LANG, LANG_NAME, LANGS, otherLang, postPath, type Lang } from "@/lib/i18n";
import type { Detected } from "@/lib/import";
import type { Post, PostRef } from "@/lib/posts";
import { DeletePostButton } from "./delete-post-button";
import { api, embedFor, localToday, MARKDOWN_EXT, MEDIA_EXT, SLUG_PATTERN, uploadFiles } from "./request";
import { cardCls, ghostBtn, hintCls, inputCls, labelCls, primaryBtn, secondaryBtn } from "./ui";

type View = "split" | "edit" | "preview";

const EMPTY: Post = { lang: "zh", slug: "", title: "", date: "", summary: "", draft: false, body: "" };

export function PostEditor({
  initial,
  host,
  defaults,
  translationExists,
}: {
  initial: Post | null;
  host: string;
  /** For new posts, e.g. a translation of an existing post: language and slug to start with. */
  defaults?: { lang: Lang; slug: string };
  /** Whether the same slug exists in the other language. */
  translationExists: boolean;
}) {
  const router = useRouter();
  const [post, setPost] = useState<Post>(
    () => initial ?? { ...EMPTY, lang: defaults?.lang ?? "zh", slug: defaults?.slug ?? "", date: localToday() },
  );
  /** Where the post is stored on disk; null until the first save. */
  const [saved, setSaved] = useState<PostRef | null>(initial ? { lang: initial.lang, slug: initial.slug } : null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial || defaults?.slug));
  /** Server-side check result, remembered together with the slug it was for. */
  const [slugCheck, setSlugCheck] = useState<{ slug: string; error: string | null } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [view, setView] = useState<View>("split");
  const [previewHtml, setPreviewHtml] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const mdInput = useRef<HTMLInputElement>(null);

  const slugFormatError = !slugTouched
    ? null
    : !post.slug
      ? "slug 不能为空"
      : !SLUG_PATTERN.test(post.slug)
        ? "只能用小写字母、数字和连字符（-），且不能以连字符开头或结尾"
        : null;
  const checkKey = `${post.lang}/${post.slug}`;
  const slugError = slugFormatError ?? (slugCheck?.slug === checkKey ? slugCheck.error : null);

  const update = useCallback((patch: Partial<Post>) => {
    setPost((p) => ({ ...p, ...patch }));
    setDirty(true);
    setMessage(null);
  }, []);

  // New posts: keep suggesting a slug from the title until the slug is edited by hand.
  useEffect(() => {
    if (slugTouched || !post.title.trim()) return;
    const t = setTimeout(async () => {
      try {
        const { slug } = await api<{ slug: string }>("/api/admin/slug", { json: { lang: post.lang, title: post.title } });
        setPost((p) => ({ ...p, slug }));
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [post.title, post.lang, slugTouched]);

  // Hand-written slugs: format is checked during render, uniqueness on the server.
  useEffect(() => {
    if (!slugTouched || slugFormatError) return;
    const lang = post.lang;
    const slug = post.slug;
    const t = setTimeout(async () => {
      try {
        const { error } = await api<{ error: string | null }>("/api/admin/slug", {
          json: { lang, slug, current: saved ?? undefined },
        });
        setSlugCheck({ slug: `${lang}/${slug}`, error });
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [post.lang, post.slug, slugTouched, slugFormatError, saved]);

  // Live preview.
  useEffect(() => {
    if (view === "edit") return;
    const t = setTimeout(async () => {
      try {
        const { html } = await api<{ html: string }>("/api/admin/preview", { json: { markdown: post.body } });
        setPreviewHtml(html);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [post.body, view]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const { post: result } = await api<{ post: Post }>(
        saved ? `/api/admin/posts/${saved.lang}/${saved.slug}` : "/api/admin/posts",
        { method: saved ? "PUT" : "POST", json: post },
      );
      setPost(result);
      setDirty(false);
      setSlugTouched(true);
      setMessage({ kind: "ok", text: "已保存" });
      if (result.slug !== saved?.slug || result.lang !== saved?.lang) {
        setSaved({ lang: result.lang, slug: result.slug });
        router.replace(`/admin/posts/${result.lang}/${result.slug}`);
      }
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [post, saved, saving, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  /** Insert text at the cursor (or replace the selection) in the body editor. */
  function insertAtCursor(snippet: string) {
    const el = textarea.current;
    const body = post.body;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const pad = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const text = `${pad}${snippet}\n\n`;
    update({ body: before + text + body.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  async function uploadAndInsert(files: File[]) {
    const media = files.filter((f) => MEDIA_EXT.test(f.name) || f.type.startsWith("image/"));
    if (!media.length) return;
    setBusy(`正在上传 ${media.length} 个文件…`);
    try {
      // Pasted screenshots are often called "image.png"; give them a dated name.
      const named = media.map((f) =>
        f.name && f.name !== "image.png" ? f : new File([f], `paste-${Date.now()}.${f.type.split("/")[1] || "png"}`, { type: f.type }),
      );
      const uploaded = await uploadFiles(named);
      insertAtCursor(uploaded.map(embedFor).join("\n\n"));
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function replaceFromMarkdown(file: File) {
    if (post.body.trim() && !confirm(`用 ${file.name} 的内容替换当前正文吗？标题、日期、摘要也会按文件重新识别。`)) return;
    setBusy("正在识别…");
    try {
      const detected = await api<Detected>("/api/admin/import", {
        json: { filename: file.name, content: await file.text() },
      });
      update({
        title: detected.title,
        date: detected.date,
        summary: detected.summary,
        body: detected.body,
        // A saved post keeps its language and slug; a new one takes what the file suggests.
        ...(saved ? {} : { lang: detected.lang }),
        ...(slugTouched ? {} : { slug: detected.slug }),
      });
      setMessage({
        kind: detected.warnings.length ? "error" : "ok",
        text: detected.warnings.length ? detected.warnings.join("；") : `已载入 ${file.name}，记得保存`,
      });
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    e.preventDefault();
    const md = files.find((f) => MARKDOWN_EXT.test(f.name));
    if (md) replaceFromMarkdown(md);
    else uploadAndInsert(files);
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      uploadAndInsert(files);
    }
  }

  const canSave = post.title.trim() && post.slug && !slugError && post.date;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className={`${ghostBtn} -ml-3`}>
          ← 文章列表
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {message && (
            <span
              role="status"
              className={`max-w-md text-sm ${message.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
            >
              {message.text}
            </span>
          )}
          {!message && dirty && <span className="text-sm text-stone-400 dark:text-zinc-500">未保存</span>}
          {saved && (
            <>
              <DeletePostButton lang={saved.lang} slug={saved.slug} title={post.title} after="/admin" />
              {translationExists ? (
                <Link href={`/admin/posts/${otherLang(saved.lang)}/${saved.slug}`} className={secondaryBtn}>
                  {LANG_NAME[otherLang(saved.lang)]}版
                </Link>
              ) : (
                <Link href={`/admin/posts/new?lang=${otherLang(saved.lang)}&slug=${saved.slug}`} className={secondaryBtn}>
                  + {LANG_NAME[otherLang(saved.lang)]}版
                </Link>
              )}
              <a href={postPath(saved.lang, saved.slug)} target="_blank" className={secondaryBtn}>
                查看 ↗
              </a>
            </>
          )}
          <button type="button" onClick={save} disabled={!canSave || saving} className={primaryBtn} title="⌘S / Ctrl+S">
            {saving ? "保存中…" : saved ? "保存" : "发布"}
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className={`${cardCls} mt-5 grid gap-5 p-5 sm:grid-cols-[1fr_180px] sm:p-6`}>
        <div className="sm:col-span-2">
          <span className={labelCls}>语言</span>
          <div className="inline-flex rounded-md bg-stone-100 p-0.5 dark:bg-zinc-800" role="radiogroup" aria-label="文章语言">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={post.lang === l}
                onClick={() => update({ lang: l })}
                className={`cursor-pointer rounded px-3 py-1 text-[13px] transition ${
                  post.lang === l
                    ? "bg-white text-stone-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                    : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
          <p className={hintCls}>
            中文文章在 {host}/，英文文章在 {host}/en/。两种语言用同一个 slug 就会互相关联，读者可以一键切换。
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="title">
            标题
          </label>
          <input
            id="title"
            value={post.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="文章标题"
            className={`${inputCls} font-serif !text-[20px]`}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="slug">
            链接（slug）
          </label>
          <div className="flex items-stretch">
            <span className="hidden items-center rounded-l-md border border-r-0 border-stone-300 bg-stone-100 px-3 text-sm text-stone-500 sm:flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              {host}
              {post.lang === "en" ? "/en/" : "/"}
            </span>
            <input
              id="slug"
              value={post.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
              }}
              placeholder="my-first-post"
              spellCheck={false}
              className={`${inputCls} font-mono !text-[14px] sm:rounded-l-none`}
            />
          </div>
          {slugError ? (
            <p className="mt-1.5 text-[12.5px] text-rose-700 dark:text-rose-400">{slugError}</p>
          ) : (
            <p className={hintCls}>
              {slugTouched ? "自定义 slug。" : "根据标题自动生成（中文转拼音），也可以直接改。"}
              {saved && (post.slug !== saved.slug || post.lang !== saved.lang) && " 保存后旧链接会失效。"}
            </p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="date">
            日期
          </label>
          <input
            id="date"
            type="date"
            value={post.date}
            onChange={(e) => update({ date: e.target.value })}
            className={inputCls}
          />
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={post.draft}
              onChange={(e) => update({ draft: e.target.checked })}
              className="size-4 accent-stone-800 dark:accent-zinc-200"
            />
            存为草稿（不公开）
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="summary">
            摘要 <span className="font-normal text-stone-400 dark:text-zinc-600">可选</span>
          </label>
          <textarea
            id="summary"
            rows={2}
            value={post.summary}
            onChange={(e) => update({ summary: e.target.value })}
            placeholder="用于搜索引擎和分享预览。留空则自动取正文第一段。"
            className={`${inputCls} resize-y`}
          />
        </div>
      </div>

      {/* Body */}
      <div className={`${cardCls} mt-5 overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-3 py-2 dark:border-zinc-800">
          <div className="flex rounded-md bg-stone-100 p-0.5 dark:bg-zinc-800">
            {(
              [
                ["edit", "编辑"],
                ["split", "分屏"],
                ["preview", "预览"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`cursor-pointer rounded px-2.5 py-1 text-[13px] transition ${
                  view === v
                    ? "bg-white text-stone-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                    : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                } ${v === "split" ? "hidden lg:block" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={`${ghostBtn} !py-1.5 text-[13px]`} onClick={() => mediaInput.current?.click()}>
            上传图片 / 视频
          </button>
          <button type="button" className={`${ghostBtn} !py-1.5 text-[13px]`} onClick={() => mdInput.current?.click()}>
            用 .md 文件替换
          </button>
          <span className="ml-auto text-[12.5px] text-stone-400 dark:text-zinc-500">
            {busy ?? "支持粘贴截图、拖入图片或 .md 文件"}
          </span>
          <input
            ref={mediaInput}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf"
            hidden
            onChange={(e) => {
              uploadAndInsert(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <input
            ref={mdInput}
            type="file"
            accept=".md,.markdown,.mdx,.txt,text/markdown"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) replaceFromMarkdown(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Split view shows the preview only on wide screens; narrow screens get the plain editor. */}
        <div className={`grid ${view === "split" ? "lg:grid-cols-2" : ""}`}>
          {view !== "preview" && (
            <textarea
              ref={textarea}
              value={post.body}
              onChange={(e) => update({ body: e.target.value })}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onPaste={onPaste}
              spellCheck={false}
              placeholder="用 Markdown 写正文…"
              className={`min-h-[65vh] w-full resize-y bg-transparent p-5 font-mono text-[14px] leading-[1.75] text-stone-800 outline-none dark:text-zinc-200 ${
                view === "split" ? "lg:border-r lg:border-stone-200 lg:dark:border-zinc-800" : ""
              }`}
            />
          )}
          {view !== "edit" && (
            <div
              className={`max-h-[80vh] overflow-y-auto px-6 py-8 ${view === "split" ? "hidden lg:block" : ""}`}
              style={{ containerType: "inline-size" }}
            >
              <div className="mx-auto max-w-[var(--content-w)]" lang={HTML_LANG[post.lang]}>
                <h1 className="article-title">{post.title || "未命名"}</h1>
                <div className="article-body prose !mt-10" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
