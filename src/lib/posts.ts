import "server-only";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { isValidDate, normalizeDate } from "./dates";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter";
import { isLang, LANGS, type Lang } from "./i18n";
import { clearLikes, moveLikes } from "./likes";
import { DATA_DIR, POSTS_DIR, UPLOADS_DIR } from "./paths";
import { validateSlug } from "./slug";

export type Post = {
  /** Language of this post. The same slug in both languages marks a translation pair. */
  lang: Lang;
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** Optional. When empty, the first paragraph of the body is used for previews. */
  summary: string;
  draft: boolean;
  body: string;
};

export type PostInput = Post;

export type PostRef = { lang: Lang; slug: string };

export class ContentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// Posts are stored as data/posts/<lang>/<slug>.md
const dirFor = (lang: Lang) => path.join(POSTS_DIR, lang);
const fileFor = (lang: Lang, slug: string) => path.join(dirFor(lang), `${slug}.md`);

// Parsed posts keyed by file path, invalidated by mtime, so listing stays cheap on every request.
const cache = new Map<string, { mtimeMs: number; post: Post }>();

let ensured: Promise<void> | null = null;

/** Create the data folders on first run (with example posts), and move posts from the old flat layout into zh/. */
function ensureDataDir(): Promise<void> {
  // Re-run if the folder disappeared while the server was running (e.g. a backup restore in progress).
  if (ensured && !existsSync(POSTS_DIR)) ensured = null;
  ensured ??= (async () => {
    const fresh = !(await exists(DATA_DIR));
    for (const lang of LANGS) await fs.mkdir(dirFor(lang), { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    for (const name of await fs.readdir(POSTS_DIR)) {
      if (name.endsWith(".md")) await fs.rename(path.join(POSTS_DIR, name), fileFor("zh", name.slice(0, -3)));
    }
    if (fresh) for (const sample of SAMPLE_POSTS) await writePostFile(sample);
  })().catch((err) => {
    ensured = null;
    throw err;
  });
  return ensured;
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readPostFile(lang: Lang, file: string): Promise<Post | null> {
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    return null;
  }
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.post;

  const raw = await fs.readFile(file, "utf8");
  const slug = path.basename(file, ".md");
  let data: Record<string, unknown> = {};
  let body = raw;
  try {
    ({ data, content: body } = parseFrontmatter(raw));
  } catch {
    // Malformed front matter in a hand-edited file: show it as body rather than hiding the post.
  }
  const post: Post = {
    lang,
    slug,
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : slug,
    date: normalizeDate(data.date) ?? new Date(stat.mtimeMs).toISOString().slice(0, 10),
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    draft: data.draft === true,
    body: body.replace(/^\n+/, ""),
  };
  cache.set(file, { mtimeMs: stat.mtimeMs, post });
  return post;
}

const byDate = (a: Post, b: Post) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "zh-CN");

/** Posts of one language (or all languages when `lang` is omitted), newest first. */
export async function listPosts({ lang, includeDrafts = false }: { lang?: Lang; includeDrafts?: boolean } = {}): Promise<Post[]> {
  await ensureDataDir();
  const langs = lang ? [lang] : LANGS;
  const lists = await Promise.all(
    langs.map(async (l) => {
      const names = (await fs.readdir(dirFor(l))).filter((n) => n.endsWith(".md") && !n.startsWith("."));
      return Promise.all(names.map((n) => readPostFile(l, path.join(dirFor(l), n))));
    }),
  );
  return lists
    .flat()
    .filter((p): p is Post => p !== null && (includeDrafts || !p.draft))
    .sort(byDate);
}

export async function getPost(lang: Lang, slug: string): Promise<Post | null> {
  if (!isLang(lang) || validateSlug(slug)) return null;
  await ensureDataDir();
  return readPostFile(lang, fileFor(lang, slug));
}

export async function listSlugs(lang: Lang): Promise<Set<string>> {
  await ensureDataDir();
  const names = await fs.readdir(dirFor(lang));
  return new Set(names.filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)));
}

function checkInput(input: PostInput): PostInput {
  const post: PostInput = {
    lang: input.lang,
    slug: String(input.slug ?? "").trim(),
    title: String(input.title ?? "").trim(),
    date: String(input.date ?? "").trim(),
    summary: String(input.summary ?? "").trim(),
    draft: Boolean(input.draft),
    body: String(input.body ?? "").replace(/\r\n?/g, "\n"),
  };
  if (!isLang(post.lang)) throw new ContentError("请选择文章语言（中文或 English）");
  const slugError = validateSlug(post.slug);
  if (slugError) throw new ContentError(slugError);
  if (!post.title) throw new ContentError("标题不能为空");
  if (post.title.length > 200) throw new ContentError("标题太长了（最多 200 字）");
  if (!isValidDate(post.date)) throw new ContentError("日期格式应为 YYYY-MM-DD");
  return post;
}

async function writePostFile(post: PostInput) {
  const data: Record<string, unknown> = { title: post.title, date: post.date };
  if (post.summary) data.summary = post.summary;
  if (post.draft) data.draft = true;
  const file = fileFor(post.lang, post.slug);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, stringifyFrontmatter(post.body, data), "utf8");
  await fs.rename(tmp, file);
  cache.delete(file);
}

const langLabel = (lang: Lang) => (lang === "zh" ? "中文" : "英文");

/**
 * Create a post (`original` undefined) or update one. Changing the slug or language moves the file.
 * Throws ContentError on invalid input or slug conflicts.
 */
export async function savePost(input: PostInput, original?: PostRef): Promise<Post> {
  await ensureDataDir();
  const post = checkInput(input);
  if (original && !(await exists(fileFor(original.lang, original.slug)))) {
    throw new ContentError("要修改的文章不存在，可能已被删除", 404);
  }
  const moved = !original || original.lang !== post.lang || original.slug !== post.slug;
  if (moved && (await exists(fileFor(post.lang, post.slug)))) {
    throw new ContentError(`${langLabel(post.lang)}文章里已经有 slug “${post.slug}” 了`, 409);
  }
  await writePostFile(post);
  if (original && moved) {
    await fs.rm(fileFor(original.lang, original.slug), { force: true });
    cache.delete(fileFor(original.lang, original.slug));
    await moveLikes(original, post);
  }
  return post;
}

export async function deletePost(lang: Lang, slug: string): Promise<void> {
  if (!isLang(lang) || validateSlug(slug)) throw new ContentError("文章不存在", 404);
  await fs.rm(fileFor(lang, slug), { force: true });
  cache.delete(fileFor(lang, slug));
  await clearLikes({ lang, slug });
}

const SAMPLE_POSTS: PostInput[] = [
  {
    lang: "zh",
    slug: "hello-world",
    title: "你好，世界",
    date: "2026-10-19",
    summary: "",
    draft: false,
    body: `这是网站自动生成的第一篇示例文章，可以在后台删除或修改。

后台地址是 \`/admin\`，在那里可以直接上传 Markdown 文件：标题、日期、语言和 slug 会自动识别，也可以手动改。

## 支持的写法

正文支持常见的 Markdown 语法：**加粗**、*斜体*、[链接](https://besthomas.com)、列表、表格、引用和代码块。

> 引用会显示成这样。

\`\`\`ts
const greeting = "你好，世界";
console.log(greeting);
\`\`\`

| 写法 | 效果 |
| --- | --- |
| \`**加粗**\` | **加粗** |
| \`*斜体*\` | *斜体* |
`,
  },
  {
    lang: "en",
    slug: "hello-world",
    title: "Hello, world",
    date: "2026-10-19",
    summary: "",
    draft: false,
    body: `This is an example post created automatically. Edit or delete it in the admin panel.

The admin panel lives at \`/admin\`. Upload a Markdown file there and the title, date, language and slug are detected for you — you can still change any of them.

## What you can write

Posts support the usual Markdown: **bold**, *italic*, [links](https://besthomas.com), lists, tables, quotes and code blocks.

> A quote looks like this.

\`\`\`ts
const greeting = "Hello, world";
console.log(greeting);
\`\`\`
`,
  },
];
