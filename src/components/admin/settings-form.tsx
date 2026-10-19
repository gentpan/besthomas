"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HTML_LANG, homePath, LANGS, type Lang } from "@/lib/i18n";
import type { LocaleSettings, SiteSettings } from "@/lib/site";
import { FooterLinksEditor } from "./footer-links-editor";
import { api } from "./request";
import { cardCls, hintCls, inputCls, labelCls, primaryBtn } from "./ui";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const update = (patch: Partial<SiteSettings>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setMessage(null);
  };
  const setLocale = (lang: Lang, patch: Partial<LocaleSettings>) => update({ [lang]: { ...s[lang], ...patch } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { settings } = await api<{ settings: SiteSettings }>("/api/admin/settings", { method: "PUT", json: s });
      setS(settings);
      setMessage({ kind: "ok", text: "已保存，刷新首页即可看到" });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-3xl space-y-5">
      {LANGS.map((lang) => {
        const loc = s[lang];
        const id = (field: string) => `${lang}-${field}`;
        return (
          <section key={lang} className={`${cardCls} space-y-5 p-5 sm:p-6`} lang={HTML_LANG[lang]}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-medium text-stone-800 dark:text-zinc-100">
                {lang === "zh" ? "中文版" : "English 版"}
              </h2>
              <a href={homePath(lang)} target="_blank" className="font-mono text-[13px] text-stone-400 hover:text-stone-800 dark:text-zinc-500 dark:hover:text-zinc-200">
                {homePath(lang)} ↗
              </a>
            </div>
            <div>
              <label className={labelCls} htmlFor={id("name")}>
                网站名称
              </label>
              <input
                id={id("name")}
                value={loc.name}
                onChange={(e) => setLocale(lang, { name: e.target.value })}
                className={`${inputCls} font-serif !text-[20px]`}
              />
              <p className={hintCls}>显示在首页大标题、浏览器标签和页脚。</p>
            </div>
            <div>
              <label className={labelCls} htmlFor={id("intro")}>
                首页简介
              </label>
              <textarea
                id={id("intro")}
                rows={5}
                value={loc.intro}
                onChange={(e) => setLocale(lang, { intro: e.target.value })}
                className={`${inputCls} resize-y leading-relaxed`}
              />
              <p className={hintCls}>
                支持 Markdown，空一行分段。链接写成 <code>[文字](https://…)</code>，强调写成 <code>*文字*</code>。
              </p>
            </div>
            <div>
              <label className={labelCls} htmlFor={id("description")}>
                网站描述
              </label>
              <input
                id={id("description")}
                value={loc.description}
                onChange={(e) => setLocale(lang, { description: e.target.value })}
                className={inputCls}
              />
              <p className={hintCls}>给搜索引擎和分享卡片看的一句话。</p>
            </div>
          </section>
        );
      })}

      <div className={`${cardCls} p-5 sm:p-6`}>
        <FooterLinksEditor
          links={s.links}
          iconStyle={s.iconStyle}
          onChange={(links) => update({ links })}
          onStyleChange={(iconStyle) => update({ iconStyle })}
        />
      </div>

      <div className={`${cardCls} p-5 sm:p-6`}>
        <span className={labelCls}>首页列表的日期</span>
        <div className="mt-2 flex flex-wrap gap-5">
          {(
            [
              ["full", "完整日期", "2026.10.19"],
              ["year", "只显示年份", "2026"],
            ] as const
          ).map(([value, label, example]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-zinc-300">
              <input
                type="radio"
                name="listDate"
                checked={s.listDate === value}
                onChange={() => update({ listDate: value })}
                className="size-4 accent-stone-800 dark:accent-zinc-200"
              />
              {label}
              <span className="font-mono text-[13px] text-stone-400 dark:text-zinc-500">{example}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? "保存中…" : "保存设置"}
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
