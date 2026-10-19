import { fail, json, clientIp } from "@/lib/api";
import { adminConfigured, checkPassword, clearFailedLogins, loginBlocked, recordFailedLogin, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  if (!adminConfigured()) return fail("服务器还没有设置 ADMIN_PASSWORD，后台暂不可用", 503);
  const ip = clientIp(req);
  if (loginBlocked(ip)) return fail("尝试次数太多，请 15 分钟后再试", 429);

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (typeof password !== "string" || !checkPassword(password)) {
    recordFailedLogin(ip);
    return fail("密码不对", 401);
  }

  clearFailedLogins(ip);
  await startSession();
  return json({ ok: true });
}
