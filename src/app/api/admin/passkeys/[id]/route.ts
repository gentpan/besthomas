import { adminRoute, json } from "@/lib/api";
import { deletePasskey } from "@/lib/passkeys";

export const DELETE = adminRoute(async (_req, ctx: RouteContext<"/api/admin/passkeys/[id]">) => {
  await deletePasskey((await ctx.params).id);
  return json({ ok: true });
});
