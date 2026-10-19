import { cookies } from "next/headers";
import { json } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
}
