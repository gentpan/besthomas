import "server-only";
import { createHash } from "node:crypto";
import rehypeShiki from "@shikijs/rehype";
import type { Element, ElementContent, Root } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const classes = (node: Element): string[] => {
  const c: unknown = node.properties.className;
  return Array.isArray(c) ? c.map(String) : typeof c === "string" ? c.split(" ") : [];
};

const isWhitespace = (n: ElementContent) => n.type === "text" && !n.value.trim();

/** External links open in a new tab; images lazy-load; a paragraph holding only images becomes a wide <figure>. */
function rehypeSiteTweaks() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "a") {
        const href = String(node.properties.href ?? "");
        if (/^https?:\/\//i.test(href)) {
          node.properties.target = "_blank";
          node.properties.rel = ["noopener", "noreferrer"];
          node.properties.className = [...classes(node), "external"];
        }
      }
      if (node.tagName === "img") {
        node.properties.loading = "lazy";
        node.properties.decoding = "async";
      }
      if (node.tagName === "p") {
        const kids = node.children.filter((c) => !isWhitespace(c));
        const onlyImages =
          kids.length > 0 && kids.every((c) => c.type === "element" && (c.tagName === "img" || c.tagName === "br"));
        if (onlyImages) {
          const imgs = kids.filter((c): c is Element => c.type === "element" && c.tagName === "img");
          const caption = imgs.length === 1 ? String(imgs[0].properties.title ?? "") : "";
          node.tagName = "figure";
          node.properties.className = ["media"];
          node.children = caption
            ? [...imgs, { type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: caption }] }]
            : imgs;
        }
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeShiki, {
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light",
    lazy: true,
    fallbackLanguage: "text",
    defaultLanguage: "text",
    onError: () => {},
  })
  .use(rehypeSiteTweaks)
  .use(rehypeStringify);

const cache = new Map<string, string>();
const CACHE_LIMIT = 300;

/** Markdown → HTML. Content is written by the site owner only, so raw HTML is allowed. */
export async function renderMarkdown(markdown: string): Promise<string> {
  const key = createHash("sha1").update(markdown).digest("hex");
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const html = String(await processor.process(markdown));
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, html);
  return html;
}

/** Plain-text excerpt for meta descriptions and RSS. */
export function excerpt(markdown: string, max = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
