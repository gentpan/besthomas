import { adminRoute, json, readJson } from "@/lib/api";
import { isLang } from "@/lib/i18n";
import { detectPost } from "@/lib/import";
import { ContentError, listSlugs } from "@/lib/posts";

type Body = {
  filename: string;
  content: string;
  /** Uploaded images from the same batch: original file name → public URL. */
  images?: Record<string, string>;
  /** "lang/slug" pairs already claimed by other files in the same batch. */
  taken?: string[];
};

/** Analyse a Markdown file without saving it, so the admin can review the detected fields first. */
export const POST = adminRoute(async (req) => {
  const body = await readJson<Body>(req);
  if (typeof body.content !== "string") throw new ContentError("缺少文件内容");
  if (body.content.length > 2_000_000) throw new ContentError("文件太大了（最多约 2 MB 文本）");
  const taken = { zh: await listSlugs("zh"), en: await listSlugs("en") };
  for (const entry of body.taken ?? []) {
    const [lang, slug] = String(entry).split("/");
    if (isLang(lang) && slug) taken[lang].add(slug);
  }
  return json(detectPost(body.content, String(body.filename ?? ""), { taken, images: body.images }));
});
