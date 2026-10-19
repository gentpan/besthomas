import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { adminRoute, json, readJson } from "@/lib/api";
import { registerPasskey } from "@/lib/passkeys";
import { ContentError } from "@/lib/posts";

/** Step 2 of adding a passkey (admin only): verify the browser's response and store the key. */
export const POST = adminRoute(async (req) => {
  const { response, name } = await readJson<{ response?: RegistrationResponseJSON; name?: string }>(req);
  if (!response) throw new ContentError("缺少通行密钥数据");
  return json({ passkey: await registerPasskey(response, String(name ?? "")) }, 201);
});
