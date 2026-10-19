import { clientIp, fail, json, sameOrigin } from "@/lib/api";
import { isLang } from "@/lib/i18n";
import { changeLikes, getLikes } from "@/lib/likes";
import { getPost } from "@/lib/posts";
import { allow } from "@/lib/rate-limit";

const DAY = 24 * 60 * 60 * 1000;

/** Anonymous like / unlike. Body: { liked: boolean } — the state the visitor wants. Returns { count }. */
export async function POST(req: Request, ctx: RouteContext<"/api/likes/[lang]/[slug]">) {
  if (!sameOrigin(req)) return fail("请求来源不被允许", 403);

  const { lang, slug } = await ctx.params;
  const post = isLang(lang) ? await getPost(lang, slug) : null;
  if (!post || post.draft) return fail("文章不存在", 404);

  const { liked } = (await req.json().catch(() => ({}))) as { liked?: unknown };
  if (typeof liked !== "boolean") return fail("参数错误");

  // Generous enough for many readers behind one shared IP, but stops a script from inflating counts.
  const ip = clientIp(req);
  if (!allow(`like:${ip}:${lang}/${slug}`, 20, DAY) || !allow(`like:${ip}`, 300, DAY)) {
    return json({ error: "操作太频繁了，请稍后再试", count: await getLikes(post) }, 429);
  }

  return json({ count: await changeLikes(post, liked ? 1 : -1) });
}
