import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { clientIp, fail, json, sameOrigin } from "@/lib/api";
import { adminConfigured, clearFailedLogins, loginBlocked, recordFailedLogin, startSession } from "@/lib/auth";
import { verifyPasskeyLogin } from "@/lib/passkeys";

/** Step 2 of passkey login (public): verify the signed challenge and start a session. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("请求来源不被允许", 403);
  if (!adminConfigured()) return fail("服务器还没有设置 ADMIN_PASSWORD，后台暂不可用", 503);
  const ip = clientIp(req);
  if (loginBlocked(ip)) return fail("尝试次数太多，请 15 分钟后再试", 429);

  const { response } = (await req.json().catch(() => ({}))) as { response?: AuthenticationResponseJSON };
  if (!response || !(await verifyPasskeyLogin(response))) {
    recordFailedLogin(ip);
    return fail("通行密钥验证失败。如果是新设备，请先用密码登录后在站点设置里添加", 401);
  }

  clearFailedLogins(ip);
  await startSession();
  return json({ ok: true });
}
