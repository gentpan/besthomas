"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LANG_NAME, LANGS, postPath } from "@/lib/i18n";
import type { Detected } from "@/lib/import";
import type { Post } from "@/lib/posts";
import { api, MARKDOWN_EXT, MEDIA_EXT, SLUG_PATTERN, uploadFiles } from "./request";
import { cardCls, ghostBtn, hintCls, inputCls, labelCls, primaryBtn, secondaryBtn } from "./ui";

type Item = {
  id: string;
  filename: string;
  state: "ready" | "saving" | "saved" | "error";
  post: Post;
  sources: Detected["sources"];
  warnings: string[];
  error?: string;
};

let nextId = 0;

export function ImportPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Images uploaded in this session, by original file name — reused by later .md files. */
  const images = useRef<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);

  const patch = (id: string, change: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...change } : it)));
  const patchPost = (id: string, change: Partial<Post>) =>
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, post: { ...it.post, ...change }, error: undefined, state: it.state === "saved" ? "saved" : "ready" } : it)),
    );

  async function addFiles(files: File[]) {
    const markdown = files.filter((f) => MARKDOWN_EXT.test(f.name));
    const media = files.filter((f) => !MARKDOWN_EXT.test(f.name) && MEDIA_EXT.test(f.name));
    const skipped = files.filter((f) => !MARKDOWN_EXT.test(f.name) && !MEDIA_EXT.test(f.name));
    setNotice(skipped.length ? `已跳过不支持的文件：${skipped.map((f) => f.name).join("、")}` : null);

    try {
      if (media.length) {
        setBusy(`正在上传 ${media.length} 个图片 / 媒体文件…`);
        for (const u of await uploadFiles(media)) images.current[u.name] = u.url;
      }
      const taken = items.filter((it) => it.state !== "saved").map((it) => `${it.post.lang}/${it.post.slug}`);
      const added: Item[] = [];
      for (const [i, file] of markdown.entries()) {
        setBusy(`正在识别 ${file.name}（${i + 1}/${markdown.length}）…`);
        const d = await api<Detected>("/api/admin/import", {
          json: { filename: file.name, content: await file.text(), images: images.current, taken },
        });
        taken.push(`${d.lang}/${d.slug}`);
        added.push({
          id: String(nextId++),
          filename: file.name,
          state: "ready",
          post: { lang: d.lang, title: d.title, slug: d.slug, date: d.date, summary: d.summary, draft: d.draft, body: d.body },
          sources: d.sources,
          warnings: d.warnings,
        });
      }
      setItems((list) => [...list, ...added]);
      if (media.length && !markdown.length) {
        setNotice(`已上传 ${media.length} 个文件。接着拖入引用它们的 .md 文件，图片地址会自动替换。`);
      }
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save(item: Item) {
    patch(item.id, { state: "saving", error: undefined });
    try {
      const { post } = await api<{ post: Post }>("/api/admin/posts", { json: item.post });
      patch(item.id, { state: "saved", post });
    } catch (err) {
      patch(item.id, { state: "error", error: (err as Error).message });
    }
  }

  const pending = items.filter((it) => it.state === "ready" || it.state === "error");

  async function saveAll() {
    for (const it of pending) await save(it);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
          dragging
            ? "border-stone-500 bg-stone-100 dark:border-zinc-400 dark:bg-zinc-800/60"
            : "border-stone-300 bg-white hover:border-stone-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-500"
        }`}
      >
        <span className="font-serif text-[20px] text-stone-700 dark:text-zinc-200">
          {busy ?? "把 .md 文件拖到这里"}
        </span>
        <span className="mt-1.5 text-sm text-stone-500 dark:text-zinc-500">
          或点击选择文件 · 支持多选 · 图片可以一起拖入
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".md,.markdown,.mdx,.txt,text/markdown,image/*,video/*"
        hidden
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {notice && <p className="mt-3 text-sm text-stone-600 dark:text-zinc-400">{notice}</p>}

      {items.length > 0 && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-stone-600 dark:text-zinc-400">
            识别结果 · {items.length} 个文件
          </h2>
          {pending.length > 0 && (
            <button type="button" onClick={saveAll} className={primaryBtn}>
              全部保存（{pending.length}）
            </button>
          )}
        </div>
      )}

      <div className="mt-3 space-y-4">
        {items.map((item) => (
          <ImportCard
            key={item.id}
            item={item}
            onChange={(c) => patchPost(item.id, c)}
            onSave={() => save(item)}
            onRemove={() => setItems((list) => list.filter((it) => it.id !== item.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ImportCard({
  item,
  onChange,
  onSave,
  onRemove,
}: {
  item: Item;
  onChange: (c: Partial<Post>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const { post } = item;
  const saved = item.state === "saved";
  const slugProblem = post.slug && !SLUG_PATTERN.test(post.slug) ? "只能用小写字母、数字和连字符（-）" : null;

  if (saved) {
    return (
      <div className={`${cardCls} flex flex-wrap items-center gap-3 px-5 py-4`}>
        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
        <span className="font-serif text-[17px] text-stone-800 dark:text-zinc-100">{post.title}</span>
        <span className="font-mono text-[13px] text-stone-500 dark:text-zinc-500">{postPath(post.lang, post.slug)}</span>
        {post.draft && <span className="text-[13px] text-amber-700 dark:text-amber-400">草稿</span>}
        <span className="ml-auto flex gap-2">
          <a href={postPath(post.lang, post.slug)} target="_blank" className={secondaryBtn}>
            查看 ↗
          </a>
          <Link href={`/admin/posts/${post.lang}/${post.slug}`} className={secondaryBtn}>
            编辑
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className={`${cardCls} p-5 sm:p-6`}>
      <div className="flex items-center gap-3">
        <span className="truncate font-mono text-[13px] text-stone-500 dark:text-zinc-500">{item.filename}</span>
        <button type="button" onClick={onRemove} className={`${ghostBtn} ml-auto !px-2 !py-1 text-[13px]`}>
          移除
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_170px]">
        <div className="sm:col-span-3">
          <span className={labelCls}>
            语言 <Source>{item.sources.lang}</Source>
          </span>
          <div className="inline-flex rounded-md bg-stone-100 p-0.5 dark:bg-zinc-800" role="radiogroup" aria-label="文章语言">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={post.lang === l}
                onClick={() => onChange({ lang: l })}
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
        </div>
        <div className="sm:col-span-3">
          <label className={labelCls}>
            标题 <Source>{item.sources.title}</Source>
          </label>
          <input value={post.title} onChange={(e) => onChange({ title: e.target.value })} className={`${inputCls} font-serif !text-[18px]`} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>
            slug <Source>{item.sources.slug}</Source>
          </label>
          <input
            value={post.slug}
            onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
            spellCheck={false}
            className={`${inputCls} font-mono !text-[14px]`}
          />
          {slugProblem && <p className="mt-1.5 text-[12.5px] text-rose-700 dark:text-rose-400">{slugProblem}</p>}
        </div>
        <div>
          <label className={labelCls}>
            日期 <Source>{item.sources.date}</Source>
          </label>
          <input type="date" value={post.date} onChange={(e) => onChange({ date: e.target.value })} className={inputCls} />
        </div>
        <div className="sm:col-span-3">
          <label className={labelCls}>
            摘要 <span className="font-normal text-stone-400 dark:text-zinc-600">可选</span>
          </label>
          <input
            value={post.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="留空则自动取正文第一段"
            className={inputCls}
          />
        </div>
      </div>

      {item.warnings.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-md bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {item.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <details className="mt-4 group">
        <summary className="cursor-pointer text-[13px] text-stone-500 select-none hover:text-stone-800 dark:text-zinc-500 dark:hover:text-zinc-200">
          正文预览（{post.body.length} 字符）
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-stone-100 p-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-stone-700 dark:bg-zinc-800/60 dark:text-zinc-300">
          {post.body.slice(0, 3000)}
          {post.body.length > 3000 && "\n…"}
        </pre>
      </details>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={item.state === "saving" || !post.title.trim() || !post.slug || Boolean(slugProblem)}
          className={primaryBtn}
        >
          {item.state === "saving" ? "保存中…" : post.draft ? "保存为草稿" : "保存并发布"}
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={post.draft}
            onChange={(e) => onChange({ draft: e.target.checked })}
            className="size-4 accent-stone-800 dark:accent-zinc-200"
          />
          草稿
        </label>
        {item.error && <span className="text-sm text-rose-700 dark:text-rose-400">{item.error}</span>}
      </div>
      <p className={hintCls}>保存后可以在编辑器里继续修改正文。</p>
    </div>
  );
}

function Source({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 font-normal text-stone-400 dark:text-zinc-600">· 来自{children}</span>;
}
