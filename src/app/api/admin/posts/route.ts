import { adminRoute, json, readJson } from "@/lib/api";
import { listPosts, savePost, type PostInput } from "@/lib/posts";

export const GET = adminRoute(async () => json({ posts: await listPosts({ includeDrafts: true }) }));

export const POST = adminRoute(async (req) => {
  const post = await savePost(await readJson<PostInput>(req));
  return json({ post }, 201);
});
