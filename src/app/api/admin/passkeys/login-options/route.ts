import { clientIp, fail, json, sameOrigin } from "@/lib/api";
import { adminConfigured, loginBlocked } from "@/lib/auth";
import { authenticationOptions, hasPasskeys } from "@/lib/passkeys";
import { allow } from "@/lib/rate-limit";

/** Step 1 of passkey login (public): options for navigator.credentials.get(). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("请求来源不被允许", 403);
  if (!adminConfigured()) return fail("服务器还没有设置 ADMIN_PASSWORD，后台暂不可用", 503);
  const ip = clientIp(req);
  if (loginBlocked(ip) || !allow(`passkey-options:${ip}`, 30, 15 * 60 * 1000)) {
    return fail("尝试次数太多，请 15 分钟后再试", 429);
  }
  if (!(await hasPasskeys())) return fail("还没有添加通行密钥，请先用密码登录", 404);
  return json(await authenticationOptions());
}
