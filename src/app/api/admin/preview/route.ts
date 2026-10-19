import { adminRoute, json, readJson } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";

export const POST = adminRoute(async (req) => {
  const { markdown } = await readJson<{ markdown?: string }>(req);
  return json({ html: await renderMarkdown(String(markdown ?? "")) });
});
