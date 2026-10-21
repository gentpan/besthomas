"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HTML_LANG, LANGS, projectsPath, UI } from "@/lib/i18n";
import { PROJECT_KINDS, type Bilingual, type Project, type ProjectsData } from "@/lib/project-kinds";
import { api, uploadFiles } from "./request";
import { cardCls, ghostBtn, hintCls, inputCls, labelCls, primaryBtn, secondaryBtn } from "./ui";

const LANG_LABEL = { zh: "中文", en: "English" } as const;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 14);

const blankProject = (): Project => ({
  id: newId(),
  kind: "website",
  name: { zh: "", en: "" },
  description: { zh: "", en: "" },
  year: String(new Date().getFullYear()),
  url: "",
  source: "",
  icon: "",
  hidden: false,
});

/** The projects page in the admin panel: page intro plus the list of projects. */
export function ProjectsEditor({ initial }: { initial: ProjectsData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Functional updates: uploads finish after an await, when this render's `data` may be stale.
  const change = (fn: (d: ProjectsData) => ProjectsData) => {
    setData(fn);
    setMessage(null);
  };
  const setItem = (id: string, patch: Partial<Project>) =>
    change((d) => ({ ...d, items: d.items.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const setText = (id: string, field: "name" | "description", lang: keyof Bilingual, value: string) =>
    change((d) => ({ ...d, items: d.items.map((p) => (p.id === id ? { ...p, [field]: { ...p[field], [lang]: value } } : p)) }));
  const move = (i: number, dir: -1 | 1) =>
    change((d) => {
      const items = [...d.items];
      [items[i], items[i + dir]] = [items[i + dir], items[i]];
      return { ...d, items };
    });

  async function uploadIcon(id: string, file: File | undefined) {
    if (!file) return;
    setUploading(id);
    try {
      const [uploaded] = await uploadFiles([file]);
      setItem(id, { icon: uploaded.url });
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { projects } = await api<{ projects: ProjectsData }>("/api/admin/projects", { method: "PUT", json: data });
      setData(projects);
      setMessage({ kind: "ok", text: "已保存，刷新项目页即可看到" });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-4xl space-y-5">
      <section className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className={labelCls}>页面简介</span>
          <span className="flex gap-3 font-mono text-[13px]">
            {LANGS.map((lang) => (
              <a
                key={lang}
                href={projectsPath(lang)}
                target="_blank"
                className="text-stone-400 hover:text-stone-800 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                {projectsPath(lang)} ↗
              </a>
            ))}
          </span>
        </div>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          {LANGS.map((lang) => (
            <textarea
              key={lang}
              lang={HTML_LANG[lang]}
              rows={3}
              value={data.intro[lang]}
              onChange={(e) => change((d) => ({ ...d, intro: { ...d.intro, [lang]: e.target.value } }))}
              placeholder={lang === "zh" ? "中文简介" : "English intro (optional)"}
              aria-label={`${LANG_LABEL[lang]}页面简介`}
              className={`${inputCls} resize-y leading-relaxed`}
            />
          ))}
        </div>
        <p className={hintCls}>显示在项目页标题下面，支持 Markdown。英文留空时英文页显示中文。</p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-stone-500 dark:text-zinc-500">共 {data.items.length} 个项目</span>
        <button type="button" className={secondaryBtn} onClick={() => change((d) => ({ ...d, items: [blankProject(), ...d.items] }))}>
          添加项目
        </button>
      </div>

      {data.items.map((p, i) => {
        const id = (field: string) => `${p.id}-${field}`;
        const letter = Array.from(p.name.zh || p.name.en || "?")[0].toUpperCase();
        return (
          <section key={p.id} className={`${cardCls} p-4 sm:p-5 ${p.hidden ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={p.kind}
                onChange={(e) => setItem(p.id, { kind: e.target.value as Project["kind"] })}
                aria-label="类型"
                className={`${inputCls} !w-auto !py-1.5`}
              >
                {PROJECT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {UI.zh.kinds[kind]}
                  </option>
                ))}
              </select>
              <input
                value={p.year}
                onChange={(e) => setItem(p.id, { year: e.target.value })}
                placeholder="年份，如 2025"
                aria-label="年份"
                className={`${inputCls} !w-36 !py-1.5`}
              />
              <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-sm text-stone-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={p.hidden}
                  onChange={(e) => setItem(p.id, { hidden: e.target.checked })}
                  className="size-4 accent-stone-800 dark:accent-zinc-200"
                />
                隐藏
              </label>
              <div className="ml-auto flex">
                <button type="button" className={`${ghostBtn} !px-2`} disabled={i === 0} onClick={() => move(i, -1)} aria-label="上移">
                  ↑
                </button>
                <button
                  type="button"
                  className={`${ghostBtn} !px-2`}
                  disabled={i === data.items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="下移"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={`${ghostBtn} !px-2 hover:!text-rose-700`}
                  onClick={() => change((d) => ({ ...d, items: d.items.filter((x) => x.id !== p.id) }))}
                >
                  删除
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-center">
                <div className="grid size-16 place-items-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800">
                  {p.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
                    <img src={p.icon} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="font-serif text-2xl text-stone-400 dark:text-zinc-500">{letter}</span>
                  )}
                </div>
                <label className={`${ghostBtn} !px-2 !py-1 text-[12.5px]`}>
                  {uploading === p.id ? "上传中…" : p.icon ? "换图标" : "上传图标"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading !== null}
                    onChange={(e) => {
                      void uploadIcon(p.id, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                {LANGS.map((lang) => (
                  <div key={lang} lang={HTML_LANG[lang]}>
                    <label className={labelCls} htmlFor={id(`name-${lang}`)}>
                      名称 · {LANG_LABEL[lang]}
                    </label>
                    <input
                      id={id(`name-${lang}`)}
                      value={p.name[lang]}
                      onChange={(e) => setText(p.id, "name", lang, e.target.value)}
                      placeholder={lang === "en" ? "留空则用中文名称" : ""}
                      className={`${inputCls} font-serif !text-[17px]`}
                    />
                  </div>
                ))}
                {LANGS.map((lang) => (
                  <div key={lang} lang={HTML_LANG[lang]}>
                    <label className={labelCls} htmlFor={id(`desc-${lang}`)}>
                      简介 · {LANG_LABEL[lang]}
                    </label>
                    <textarea
                      id={id(`desc-${lang}`)}
                      rows={2}
                      value={p.description[lang]}
                      onChange={(e) => setText(p.id, "description", lang, e.target.value)}
                      placeholder={lang === "zh" ? "一两句话介绍它做什么" : "留空则用中文简介"}
                      className={`${inputCls} resize-y leading-relaxed`}
                    />
                  </div>
                ))}
                <div>
                  <label className={labelCls} htmlFor={id("url")}>
                    链接
                  </label>
                  <input
                    id={id("url")}
                    value={p.url}
                    onChange={(e) => setItem(p.id, { url: e.target.value })}
                    placeholder="网站、应用商店或下载页地址"
                    className={`${inputCls} font-mono !text-[14px]`}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={id("source")}>
                    源码
                  </label>
                  <input
                    id={id("source")}
                    value={p.source}
                    onChange={(e) => setItem(p.id, { source: e.target.value })}
                    placeholder="https://github.com/…（可选）"
                    className={`${inputCls} font-mono !text-[14px]`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor={id("icon")}>
                    图标地址
                  </label>
                  <input
                    id={id("icon")}
                    value={p.icon}
                    onChange={(e) => setItem(p.id, { icon: e.target.value })}
                    placeholder="上传后自动填好，也可以填图片地址；留空显示名称首字"
                    className={`${inputCls} font-mono !text-[14px]`}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {data.items.length === 0 && (
        <p className={`${cardCls} p-6 text-center text-sm text-stone-500 dark:text-zinc-500`}>还没有项目，点上面的“添加项目”开始。</p>
      )}

      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-xl border border-stone-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <button type="submit" disabled={saving || uploading !== null} className={primaryBtn}>
          {saving ? "保存中…" : "保存项目"}
        </button>
        {message && (
          <span className={`text-sm ${message.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
