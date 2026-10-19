/**
 * Footer icons are SVG code pasted in the admin panel. They are only ever used as images (an <img> and a
 * CSS mask), never inlined into the page, so scripts inside a pasted SVG cannot run.
 * Safe to import from client code (used for the live preview in the admin panel).
 */

export const ICON_MAX_LENGTH = 20_000;

/** Two looks for all footer icons: dark with colour on hover, or grey turning dark on hover. */
export type IconStyle = "black-color" | "gray-black";

const attr = (tag: string, name: string) => new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag)?.[2];

/**
 * Clean up pasted SVG code so every icon scales into the same square: drop the XML prolog and comments,
 * make sure the root has a viewBox and xmlns, and remove fixed width/height. Returns an error message
 * (in Chinese) when the code is not usable.
 */
export function normalizeSvg(raw: string): { svg: string } | { error: string } {
  let svg = raw
    .trim()
    .replace(/^<\?xml[\s\S]*?\?>/i, "")
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Belt and braces: icons are only used as images, where scripts never run, but don't keep them anyway.
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .trim();
  if (!svg) return { error: "图标代码是空的" };
  if (svg.length > ICON_MAX_LENGTH) return { error: "图标代码太长了（最多 2 万个字符）" };
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) return { error: "需要以 <svg 开头、以 </svg> 结尾的完整 SVG 代码" };

  const open = /^<svg\b[^>]*>/i.exec(svg)![0];
  let tag = open;
  if (!attr(tag, "viewBox")) {
    const w = parseFloat(attr(tag, "width") ?? "");
    const h = parseFloat(attr(tag, "height") ?? "");
    if (!(w > 0 && h > 0)) return { error: "SVG 缺少 viewBox，也没有可用的 width / height" };
    tag = tag.replace(/^<svg\b/i, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  tag = tag.replace(/\s(width|height)\s*=\s*(["']).*?\2/gi, "");
  if (!/\sxmlns\s*=/.test(tag)) tag = tag.replace(/^<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  svg = tag + svg.slice(open.length);
  return { svg };
}

/** The icon as a data: URL, for <img src> and CSS mask-image. */
export const svgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const NEUTRAL = /^(none|currentcolor|transparent|inherit|black|#000|#000000|#000f|#000000ff|rgb\(0,\s*0,\s*0\))$/i;

/**
 * Whether the SVG paints with its own colours (a brand logo), as opposed to a one-colour glyph. Coloured
 * icons show their own colours on hover in the "black-color" style; one-colour icons use the link's
 * hover colour instead.
 */
export function svgHasColors(svg: string): boolean {
  const values = [
    ...svg.matchAll(/\s(?:fill|stroke|stop-color|color)\s*=\s*(["'])(.*?)\1/gi),
    ...svg.matchAll(/(?:fill|stroke|stop-color)\s*:\s*([^;"'}]+)/gi),
  ].map((m) => (m[2] ?? m[1]).trim());
  return values.some((v) => v && !NEUTRAL.test(v) && !/^url\(/i.test(v));
}

export const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
