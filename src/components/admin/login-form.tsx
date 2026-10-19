"use client";

import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { useState, useSyncExternalStore } from "react";
import { inputCls, primaryBtn, secondaryBtn } from "./ui";

const noop = () => () => {};

export function LoginForm({ configured, next, passkeys }: { configured: boolean; next: string; passkeys: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "passkey" | null>(null);
  // WebAuthn availability is only known in the browser; render the passkey button after hydration.
  const webauthn = useSyncExternalStore(noop, browserSupportsWebAuthn, () => false);

  if (!configured) {
    return (
      <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
        服务器还没有设置 <code>ADMIN_PASSWORD</code> 环境变量，后台暂时不可用。设置后重启服务即可。
      </p>
    );
  }

  const done = () => {
    // Full navigation so every server component re-renders with the new session cookie.
    window.location.href = next;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending("password");
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return done();
    const data = await res.json().catch(() => ({}));
    setError(data.error || "登录失败");
    setPending(null);
  }

  async function loginWithPasskey() {
    setPending("passkey");
    setError(null);
    try {
      const optionsRes = await fetch("/api/admin/passkeys/login-options", { method: "POST" });
      const optionsJSON = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsJSON.error || "无法开始通行密钥登录");
      const response = await startAuthentication({ optionsJSON });
      const res = await fetch("/api/admin/passkeys/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (res.ok) return done();
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "通行密钥登录失败");
    } catch (err) {
      const e = err as Error;
      setError(e.name === "NotAllowedError" ? "已取消，或这台设备上没有本站的通行密钥" : e.message);
      setPending(null);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      {passkeys && webauthn && (
        <>
          <button type="button" onClick={loginWithPasskey} disabled={pending !== null} className={`${secondaryBtn} w-full`}>
            {pending === "passkey" ? "等待验证…" : "使用通行密钥登录"}
          </button>
          <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-zinc-600">
            <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-800" />
            或使用密码
            <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-800" />
          </div>
        </>
      )}
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          autoFocus={!passkeys}
          autoComplete="current-password"
          placeholder="密码"
          aria-label="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        <button type="submit" disabled={pending !== null || !password} className={`${primaryBtn} w-full`}>
          {pending === "password" ? "登录中…" : "登录"}
        </button>
      </form>
      {error && <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
    </div>
  );
}
