import "server-only";
import matter from "gray-matter";

// gray-matter evaluates `---js` front matter with eval(); never allow that for uploaded files.
const noEval = () => ({});
const OPTIONS = { engines: { js: noEval, javascript: noEval } };

export type Parsed = { data: Record<string, unknown>; content: string };

/** Parse YAML front matter. Throws on malformed YAML. Passing options also bypasses gray-matter's shared cache. */
export function parseFrontmatter(raw: string): Parsed {
  const { data, content } = matter(raw, OPTIONS);
  return { data: (data ?? {}) as Record<string, unknown>, content };
}

export function stringifyFrontmatter(body: string, data: Record<string, unknown>): string {
  return matter.stringify(body.endsWith("\n") ? body : `${body}\n`, data);
}
