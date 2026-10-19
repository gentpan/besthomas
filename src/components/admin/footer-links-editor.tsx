"use client";

import { useState } from "react";
import { FooterIcon } from "@/components/footer-icon";
import type { SiteLink } from "@/lib/site";
import { HEX_COLOR, normalizeSvg, svgHasColors, type IconStyle } from "@/lib/svg-icon";
import { ghostBtn, hintCls, inputCls, labelCls, secondaryBtn } from "./ui";

const STYLES: { value: IconStyle; label: string; hint: string }[] = [
  { value: "black-color", label: "黑色，悬浮显示彩色", hint: "彩色图标悬浮时显示原本的颜色；单色图标悬浮时用你设置的悬浮颜色" },
  { value: "gray-black", label: "灰色，悬浮变黑色", hint: "所有图标平时是灰色，悬浮时变成黑色（深色模式下是白色）" },
];

/** Footer links in the site settings: label, URL, optional pasted SVG icon and hover colour. */
export function FooterLinksEditor({
  links,
  iconStyle,
  onChange,
  onStyleChange,
}: {
  links: SiteLink[];
  iconStyle: IconStyle;
  onChange: (links: SiteLink[]) => void;
  onStyleChange: (style: IconStyle) => void;
}) {
  // Rows whose icon editor is open even though they have no icon yet.
  const [open, setOpen] = useState<Set<number>>(new Set());
  const setLink = (i: number, patch: Partial<SiteLink>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...links];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  const withIcons = links.filter((l) => l.icon && "svg" in normalizeSvg(l.icon));

  return (
    <div>
      <span className={labelCls}>页脚链接（两种语言共用）</span>
      <div className="space-y-3">
        {links.map((link, i) => {
          const showIcon = Boolean(link.icon) || open.has(i);
          const parsed = link.icon ? normalizeSvg(link.icon) : null;
          const svg = parsed && "svg" in parsed ? parsed.svg : null;
          return (
            <div key={i} className="rounded-lg border border-stone-200 p-3 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <input
                  value={link.label}
                  onChange={(e) => setLink(i, { label: e.target.value })}
                  placeholder="名称，如 GitHub"
                  aria-label="链接名称"
                  className={`${inputCls} sm:!w-40`}
                />
                <input
                  value={link.url}
                  onChange={(e) => setLink(i, { url: e.target.value })}
                  placeholder="https://github.com/yourname"
                  aria-label="链接地址"
                  className={`${inputCls} font-mono !text-[14px]`}
                />
                <div className="flex shrink-0">
                  <button type="button" className={`${ghostBtn} !px-2`} disabled={i === 0} onClick={() => move(i, -1)} aria-label="上移">
                    ↑
                  </button>
                  <button
                    type="button"
                    className={`${ghostBtn} !px-2`}
                    disabled={i === links.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${ghostBtn} !px-2 hover:!text-rose-700`}
                    onClick={() => onChange(links.filter((_, j) => j !== i))}
                  >
                    删除
                  </button>
                </div>
              </div>

              {showIcon ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <textarea
                      rows={3}
                      value={link.icon ?? ""}
                      onChange={(e) => setLink(i, { icon: e.target.value })}
                      placeholder={'粘贴 SVG 代码，如 <svg viewBox="0 0 24 24">…</svg>'}
                      aria-label={`${link.label || "链接"}的图标 SVG`}
                      spellCheck={false}
                      className={`${inputCls} resize-y font-mono !text-[12.5px] leading-relaxed`}
                    />
                    {parsed && "error" in parsed && (
                      <p className="mt-1 text-[12.5px] text-rose-700 dark:text-rose-400">{parsed.error}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-stone-600 dark:text-zinc-400">
                      <span>悬浮颜色</span>
                      <input
                        type="color"
                        value={link.color && HEX_COLOR.test(link.color) && link.color.length === 7 ? link.color : "#1d9bf0"}
                        onChange={(e) => setLink(i, { color: e.target.value })}
                        aria-label="悬浮颜色"
                        className="h-7 w-9 cursor-pointer rounded border border-stone-300 bg-transparent p-0.5 dark:border-zinc-700"
                      />
                      <span className="font-mono">{link.color ?? "未设置"}</span>
                      {link.color && (
                        <button type="button" className={`${ghostBtn} !px-1.5 !py-0.5 text-[12px]`} onClick={() => setLink(i, { color: undefined })}>
                          清除
                        </button>
                      )}
                      {svg && iconStyle === "black-color" && (
                        <span className="text-stone-400 dark:text-zinc-500">
                          {svgHasColors(svg) ? "· 彩色图标，悬浮显示原色" : "· 单色图标，悬浮时用这个颜色"}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`${ghostBtn} ml-auto !px-1.5 !py-0.5 text-[12px] hover:!text-rose-700`}
                        onClick={() => {
                          setLink(i, { icon: undefined, color: undefined });
                          setOpen((s) => new Set([...s].filter((x) => x !== i)));
                        }}
                      >
                        不用图标
                      </button>
                    </div>
                  </div>
                  <div
                    className="flex h-[76px] w-[76px] items-center justify-center rounded-md border border-dashed border-stone-300 dark:border-zinc-700"
                    data-icon-style={iconStyle}
                    title="预览：鼠标移上去看悬浮效果"
                  >
                    {svg ? (
                      <FooterIcon svg={svg} label={link.label} color={link.color} />
                    ) : (
                      <span className="text-[11px] text-stone-400 dark:text-zinc-600">预览</span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${ghostBtn} mt-2 !px-2 !py-1 text-[13px]`}
                  onClick={() => setOpen((s) => new Set(s).add(i))}
                >
                  + 用图标代替文字
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => onChange([...links, { label: "", url: "" }])}>
        添加链接
      </button>
      <p className={hintCls}>
        比如 X、GitHub、邮箱（mailto:you@example.com）。贴了图标的链接在页脚只显示图标，名称会作为鼠标悬停提示；图标会统一缩放到同样大小。
        可以在 simpleicons.org 之类的网站复制 SVG。
      </p>

      <div className="mt-5">
        <span className={labelCls}>图标样式</span>
        <div className="space-y-2">
          {STYLES.map((s) => (
            <label key={s.value} className="flex cursor-pointer items-start gap-2 text-sm text-stone-700 dark:text-zinc-300">
              <input
                type="radio"
                name="iconStyle"
                checked={iconStyle === s.value}
                onChange={() => onStyleChange(s.value)}
                className="mt-0.5 size-4 accent-stone-800 dark:accent-zinc-200"
              />
              <span>
                {s.label}
                <span className="block text-[12.5px] text-stone-400 dark:text-zinc-500">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {withIcons.length > 0 && (
          <div className="mt-3 flex items-center gap-4 rounded-md bg-stone-50 px-4 py-3 dark:bg-zinc-950" data-icon-style={iconStyle}>
            <span className="text-[12.5px] text-stone-400 dark:text-zinc-500">页脚预览</span>
            {withIcons.map((l, i) => (
              <FooterIcon key={i} svg={(normalizeSvg(l.icon!) as { svg: string }).svg} label={l.label} color={l.color} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
