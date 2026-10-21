import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import type { Lang } from "./i18n";
import { DATA_DIR, PROJECTS_FILE } from "./paths";
import { ContentError } from "./posts";
import { isProjectKind, type Bilingual, type Project, type ProjectKind, type ProjectsData } from "./project-kinds";

/** Used until projects are saved in the admin panel: the site itself as the first entry. */
export const DEFAULT_PROJECTS: ProjectsData = {
  intro: {
    zh: "平时做的一些东西：网站、App 和浏览器插件。",
    en: "Things I've made: websites, apps and browser extensions.",
  },
  items: [
    {
      id: "besthomas",
      kind: "website",
      name: { zh: "besthomas.com", en: "besthomas.com" },
      description: {
        zh: "就是这个网站。用 Next.js 写的个人主页，后台直接上传 Markdown 发文章，代码开源。",
        en: "This website: a personal site built with Next.js, with an admin panel that publishes Markdown files. Open source.",
      },
      year: "2026",
      url: "https://besthomas.com",
      source: "https://github.com/gentpan/besthomas",
      icon: "/icon.svg",
      hidden: false,
    },
  ],
};

let cached: { mtimeMs: number; data: ProjectsData } | null = null;

export async function getProjects(): Promise<ProjectsData> {
  try {
    const stat = await fs.stat(PROJECTS_FILE);
    if (cached?.mtimeMs === stat.mtimeMs) return cached.data;
    const data = sanitize(JSON.parse(await fs.readFile(PROJECTS_FILE, "utf8")));
    cached = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch {
    return DEFAULT_PROJECTS;
  }
}

/** A project as one language's page shows it. */
export type ProjectCard = Omit<Project, "name" | "description" | "hidden"> & { name: string; description: string };

/** Visible projects in one language, plus the page intro. */
export async function listProjects(lang: Lang): Promise<{ intro: string; items: ProjectCard[] }> {
  const data = await getProjects();
  const pick = (text: Bilingual) => (lang === "en" ? text.en || text.zh : text.zh || text.en);
  return {
    intro: pick(data.intro),
    items: data.items
      .filter((p) => !p.hidden)
      .map((p) => ({
        id: p.id,
        kind: p.kind,
        name: pick(p.name),
        description: pick(p.description),
        year: p.year,
        url: p.url,
        source: p.source,
        icon: p.icon,
      })),
  };
}

/** Projects grouped by kind; groups appear in the order of their first project. */
export function groupProjects(items: ProjectCard[]): { kind: ProjectKind; items: ProjectCard[] }[] {
  const groups = new Map<ProjectKind, ProjectCard[]>();
  for (const item of items) groups.set(item.kind, [...(groups.get(item.kind) ?? []), item]);
  return [...groups].map(([kind, list]) => ({ kind, items: list }));
}

const obj = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "");
const bilingual = (v: unknown): Bilingual => ({ zh: str(obj(v).zh), en: str(obj(v).en) });

const LINK = /^(https?:\/\/|\/(?!\/))/;
const ID = /^[a-z0-9-]{1,64}$/i;

function sanitize(input: unknown): ProjectsData {
  const o = obj(input);
  const seen = new Set<string>();
  const items = (Array.isArray(o.items) ? o.items : []).map((raw): Project => {
    const p = obj(raw);
    let id = str(p.id);
    if (!ID.test(id) || seen.has(id)) id = randomUUID();
    seen.add(id);
    // Unsafe addresses (javascript: and the like) are dropped rather than shown.
    const link = (v: unknown) => (LINK.test(str(v)) ? str(v) : "");
    return {
      id,
      kind: isProjectKind(p.kind) ? p.kind : "other",
      name: bilingual(p.name),
      description: bilingual(p.description),
      year: str(p.year).slice(0, 40),
      url: link(p.url),
      source: link(p.source),
      icon: link(p.icon),
      hidden: p.hidden === true,
    };
  });
  return { intro: bilingual(o.intro), items: items.filter((p) => p.name.zh || p.name.en) };
}

export async function saveProjects(input: unknown): Promise<ProjectsData> {
  const raw = Array.isArray(obj(input).items) ? (obj(input).items as unknown[]) : [];
  raw.forEach((item, i) => {
    const p = obj(item);
    const label = str(obj(p.name).zh) || str(obj(p.name).en);
    if (!label) throw new ContentError(`第 ${i + 1} 个项目还没有名称`);
    for (const [field, name] of [
      ["url", "链接"],
      ["source", "源码地址"],
      ["icon", "图标地址"],
    ] as const) {
      const value = str(p[field]);
      if (value && !LINK.test(value)) throw new ContentError(`项目 “${label}” 的${name}需要以 https://、http:// 或 / 开头`);
    }
  });
  const data = sanitize(input);
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${PROJECTS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, PROJECTS_FILE);
  cached = null;
  return data;
}
