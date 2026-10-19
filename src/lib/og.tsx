import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Social preview images ("Open Graph" images, shown when a link is shared on X, WeChat, Slack…):
// a sheet of paper lying slightly tilted on grid paper, with the site name or post title on it —
// the same look as the site itself.

export const OG_SIZE = { width: 1200, height: 630 };

// The image renderer only reads ttf/otf/woff (not woff2), so fonts come from the static @fontsource packages.
// The files are listed in next.config.ts (outputFileTracingIncludes) so they ship with the server build.
const FONT_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules/@fontsource");

const fileCache = new Map<string, Promise<Buffer>>();
const readFont = (file: string) => {
  let hit = fileCache.get(file);
  if (!hit) {
    hit = fs.readFile(path.join(FONT_DIR, file));
    fileCache.set(file, hit);
  }
  return hit;
};

/** Noto Serif SC is split into ~100 files by Unicode range; load only the ones the text needs. */
type Slice = { file: string; ranges: [number, number][] };
let slices: Promise<Slice[]> | null = null;

function loadSlices(): Promise<Slice[]> {
  slices ??= fs.readFile(path.join(FONT_DIR, "noto-serif-sc/400.css"), "utf8").then((css) =>
    css
      .split("@font-face")
      .map((block) => {
        const file = /url\(\.\/files\/([^)]+-400-normal\.woff)\)/.exec(block)?.[1];
        const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
        if (!file || !range) return null;
        const ranges = range.split(",").map((part): [number, number] => {
          const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
          return [parseInt(a, 16), parseInt(b ?? a, 16)];
        });
        return { file: `noto-serif-sc/files/${file}`, ranges };
      })
      .filter((s): s is Slice => s !== null),
  );
  return slices;
}

async function cjkFonts(text: string) {
  const all = await loadSlices();
  const needed = new Set<Slice>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x2e80) continue; // Latin and punctuation come from Crimson Pro
    const slice = all.find((s) => s.ranges.some(([a, b]) => cp >= a && cp <= b));
    if (slice) needed.add(slice);
  }
  return Promise.all(
    [...needed].map(async (s, i) => ({ name: `NotoSerifSC${i}`, data: await readFont(s.file), weight: 400 as const })),
  );
}

// 30px grid, drawn as an SVG pattern.
const GRID = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">` +
    `<defs><pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse">` +
    `<path d="M30 0H0V30" fill="none" stroke="#78716c" stroke-opacity="0.13" stroke-width="1"/>` +
    `</pattern></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`,
).toString("base64")}`;

/** Shorten long titles so they fit on the sheet in at most three lines. */
function clip(text: string, max: number) {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : text;
}

/**
 * @param heading  big text on the sheet (site name, or post title)
 * @param kicker   small line above the heading (the site name on post images)
 */
export async function ogImage({ heading, kicker }: { heading: string; kicker?: string }) {
  const isCjk = /[㐀-鿿]/.test(heading);
  const title = kicker ? clip(heading, isCjk ? 34 : 70) : clip(heading, 40);
  const cjk = await cjkFonts(`${title}${kicker ?? ""}`);
  const family = ["Crimson Pro", ...cjk.map((f) => f.name)].join(", ");
  const latin = await readFont("crimson-pro/files/crimson-pro-latin-400-normal.woff");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fafaf9", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not a page */}
        <img src={GRID} width={1200} height={630} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 172,
            top: 96,
            width: 920,
            height: 720,
            display: "flex",
            flexDirection: "column",
            padding: kicker ? "84px 88px" : "104px 88px",
            background: "#ffffff",
            boxShadow: "0 0 0 1px rgba(120,113,108,0.10), 0 30px 60px rgba(0,0,0,0.10)",
            transform: "rotate(4.5deg)",
            transformOrigin: "top left",
            fontFamily: family,
          }}
        >
          {kicker && <div style={{ fontSize: 30, color: "#a8a29e", marginBottom: 28, letterSpacing: -0.3 }}>{kicker}</div>}
          <div
            style={{
              fontSize: kicker ? (isCjk ? 60 : 64) : 76,
              lineHeight: 1.22,
              color: "#44403c",
              letterSpacing: isCjk ? 0 : -1.5,
              maxWidth: 720,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Crimson Pro", data: latin, weight: 400 },
        ...cjk,
      ],
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
