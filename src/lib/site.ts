import "server-only";
import fs from "node:fs/promises";
import { isLang, LANGS, type Lang } from "./i18n";
import { DATA_DIR, SITE_FILE } from "./paths";
import { ContentError } from "./posts";
import { HEX_COLOR, normalizeSvg, type IconStyle } from "./svg-icon";

export type SiteLink = {
  label: string;
  /** Empty while the address isn't known yet: the link is kept in the admin panel but not shown on the site. */
  url: string;
  /** Optional SVG code; when set, the footer shows the icon instead of the label. */
  icon?: string;
  /** Optional hover colour for one-colour icons in the "black-color" style, e.g. #1d9bf0. */
  color?: string;
};

/** The parts of the homepage that differ between the Chinese and English versions. */
export type LocaleSettings = {
  /** Big heading on the homepage, browser tab title and footer. */
  name: string;
  /** Markdown. Blank lines separate paragraphs. */
  intro: string;
  /** For search engines and link previews. */
  description: string;
};

export type SiteSettings = {
  zh: LocaleSettings;
  en: LocaleSettings;
  links: SiteLink[];
  /** How footer icons are coloured. */
  iconStyle: IconStyle;
  /** How dates appear in the homepage list. */
  listDate: "full" | "year";
};

export const DEFAULT_SETTINGS: SiteSettings = {
  zh: {
    name: "Thomas",
    intro:
      "在这里写一段自我介绍，比如你是谁、在做什么。\n\n简介支持 Markdown，可以放[链接](https://besthomas.com)，也可以用 *斜体* 强调。",
    description: "Thomas 的个人网站",
  },
  en: {
    name: "Thomas",
    intro:
      "Write a short introduction here — who you are and what you are working on.\n\nThe intro supports Markdown, so you can add [links](https://besthomas.com) or *emphasis*.",
    description: "Thomas's personal website",
  },
  links: [],
  iconStyle: "black-color",
  listDate: "full",
};

let cached: { mtimeMs: number; settings: SiteSettings } | null = null;

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const stat = await fs.stat(SITE_FILE);
    if (cached?.mtimeMs === stat.mtimeMs) return cached.settings;
    const settings = sanitize(JSON.parse(await fs.readFile(SITE_FILE, "utf8")));
    cached = { mtimeMs: stat.mtimeMs, settings };
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

function sanitizeLocale(input: unknown, fallback: LocaleSettings): LocaleSettings {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    name: str(o.name)?.trim() || fallback.name,
    intro: str(o.intro)?.replace(/\r\n?/g, "\n").trim() ?? fallback.intro,
    description: str(o.description)?.trim() ?? fallback.description,
  };
}

function sanitize(input: unknown): SiteSettings {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  // Settings saved before the site was bilingual kept name/intro/description at the top level.
  const legacyZh = typeof o.name === "string" ? o : undefined;
  const links = Array.isArray(o.links)
    ? o.links
        .filter((l): l is SiteLink => !!l && typeof l.label === "string" && typeof l.url === "string")
        .map((l) => {
          const link: SiteLink = { label: l.label.trim(), url: l.url.trim() };
          if (typeof l.icon === "string" && l.icon.trim()) link.icon = l.icon.trim();
          if (typeof l.color === "string" && HEX_COLOR.test(l.color.trim())) link.color = l.color.trim();
          return link;
        })
        .filter((l) => l.label)
    : DEFAULT_SETTINGS.links;
  return {
    zh: sanitizeLocale(o.zh ?? legacyZh, DEFAULT_SETTINGS.zh),
    en: sanitizeLocale(o.en, DEFAULT_SETTINGS.en),
    links,
    iconStyle: o.iconStyle === "gray-black" ? "gray-black" : "black-color",
    listDate: o.listDate === "year" ? "year" : "full",
  };
}

export async function saveSiteSettings(input: unknown): Promise<SiteSettings> {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, Record<string, unknown> | undefined>;
  for (const lang of LANGS) {
    if (isLang(lang) && !str(o[lang]?.name)?.trim()) {
      throw new ContentError(`${lang === "zh" ? "中文版" : "English 版"}的网站名称不能为空`);
    }
  }
  const settings = sanitize(input);
  for (const link of settings.links) {
    if (link.url && !/^(https?:\/\/|mailto:|\/)/.test(link.url)) {
      throw new ContentError(`链接 “${link.label}” 的地址需要以 https://、http://、mailto: 或 / 开头`);
    }
    if (link.icon) {
      const result = normalizeSvg(link.icon);
      if ("error" in result) throw new ContentError(`链接 “${link.label}” 的图标：${result.error}`);
      link.icon = result.svg;
    }
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${SITE_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(settings, null, 2) + "\n", "utf8");
  await fs.rename(tmp, SITE_FILE);
  cached = null;
  return settings;
}

export const localeOf = (site: SiteSettings, lang: Lang): LocaleSettings => site[lang];
