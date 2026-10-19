import { adminRoute, fail, json, readJson } from "@/lib/api";
import { isLang } from "@/lib/i18n";
import { ContentError, deletePost, getPost, savePost, type PostInput } from "@/lib/posts";

type Ctx = RouteContext<"/api/admin/posts/[lang]/[slug]">;

async function refOf(ctx: Ctx) {
  const { lang, slug } = await ctx.params;
  if (!isLang(lang)) throw new ContentError("文章不存在", 404);
  return { lang, slug };
}

export const GET = adminRoute(async (_req, ctx: Ctx) => {
  const { lang, slug } = await refOf(ctx);
  const post = await getPost(lang, slug);
  return post ? json({ post }) : fail("文章不存在", 404);
});

/** Update a post. The body may carry a new lang/slug, which moves it. */
export const PUT = adminRoute(async (req, ctx: Ctx) => {
  const post = await savePost(await readJson<PostInput>(req), await refOf(ctx));
  return json({ post });
});

export const DELETE = adminRoute(async (_req, ctx: Ctx) => {
  const { lang, slug } = await refOf(ctx);
  await deletePost(lang, slug);
  return json({ ok: true });
});
