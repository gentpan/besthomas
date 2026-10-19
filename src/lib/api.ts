import "server-only";
import { NextResponse } from "next/server";
import { isAdmin } from "./auth";
import { ContentError } from "./posts";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Reject cross-site browser requests (for the admin API: defence in depth on top of SameSite=Lax). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Wrap an admin API handler: checks the session and origin, and turns ContentError into JSON errors.
 */
export function adminRoute<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    if (!(await isAdmin())) return fail("登录已过期，请重新登录", 401);
    if (req.method !== "GET" && !sameOrigin(req)) return fail("请求来源不被允许", 403);
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ContentError) return fail(err.message, err.status);
      console.error(err);
      return fail("服务器出错了，请稍后重试", 500);
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ContentError("请求内容不是有效的 JSON");
  }
}

/**
 * Client IP as seen by the reverse proxy. The last X-Forwarded-For entry is the one the proxy itself added;
 * earlier entries (and headers like X-Real-IP that Caddy passes through) can be forged by the client.
 */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
}
