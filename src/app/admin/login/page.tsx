import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { hasPasskeys } from "@/lib/passkeys";

export const metadata: Metadata = { title: "登录后台", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/admin") ? next : "/admin";
  if (await isAdmin()) redirect(target);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-[340px]">
        <h1 className="font-serif text-[28px] leading-tight text-stone-700 dark:text-zinc-200">后台登录</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-zinc-500">用通行密钥或管理密码登录。</p>
        <LoginForm configured={adminConfigured()} next={target} passkeys={await hasPasskeys()} />
      </div>
    </main>
  );
}
