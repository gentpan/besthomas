"use client";

import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { useState, useSyncExternalStore } from "react";
import type { PasskeyInfo } from "@/lib/passkeys";
import { api } from "./request";
import { cardCls, hintCls, inputCls, labelCls, primaryBtn } from "./ui";

const noop = () => () => {};

/** A readable default name such as "Mac · Chrome", so several passkeys can be told apart. */
function guessDeviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(" · ");
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export function PasskeyManager({ initial }: { initial: PasskeyInfo[] }) {
  const [passkeys, setPasskeys] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const webauthn = useSyncExternalStore(noop, browserSupportsWebAuthn, () => true);

  async function add() {
    setBusy(true);
    setMessage(null);
    try {
      const optionsJSON = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>(
        "/api/admin/passkeys/register-options",
        { method: "POST" },
      );
      const response = await startRegistration({ optionsJSON });
      const { passkey } = await api<{ passkey: PasskeyInfo }>("/api/admin/passkeys/register", {
        json: { response, name: name.trim() || guessDeviceName() },
      });
      setPasskeys((list) => [...list, passkey]);
      setName("");
      setMessage({ kind: "ok", text: "已添加。下次登录可以直接用这个通行密钥。" });
    } catch (err) {
      const e = err as Error;
      const text =
        e.name === "NotAllowedError"
          ? "已取消"
          : e.name === "InvalidStateError"
            ? "这台设备上已经有本站的通行密钥了"
            : e.message;
      setMessage({ kind: "error", text });
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: PasskeyInfo) {
    if (!confirm(`删除通行密钥「${p.name}」吗？删除后这台设备需要重新添加才能用它登录。`)) return;
    try {
      await api(`/api/admin/passkeys/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      setPasskeys((list) => list.filter((x) => x.id !== p.id));
      setMessage({ kind: "ok", text: "已删除" });
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    }
  }

  return (
    <section className={`${cardCls} mt-5 max-w-3xl p-5 sm:p-6`}>
      <h2 className="text-[15px] font-medium text-stone-800 dark:text-zinc-100">通行密钥（Passkey）</h2>
      <p className={hintCls}>
        用指纹、面容或设备密码登录后台，不用输入密码。通行密钥只能在本网站的域名下使用；换了新设备，先用密码登录再在这里添加。
      </p>

      {passkeys.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-zinc-800 dark:border-zinc-800">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-stone-800 dark:text-zinc-100">
                  {p.name}
                  {p.deviceType === "multiDevice" && (
                    <span className="ml-2 rounded bg-stone-100 px-1.5 py-px text-[11px] font-normal text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                      可跨设备同步
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[12.5px] text-stone-500 dark:text-zinc-500">
                  添加于 {formatTime(p.createdAt)}
                  {p.lastUsedAt ? ` · 最近使用 ${formatTime(p.lastUsedAt)}` : " · 还没用过"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(p)}
                className="cursor-pointer text-sm text-stone-400 hover:text-rose-700 dark:text-zinc-500 dark:hover:text-rose-400"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      {webauthn ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label className={labelCls} htmlFor="passkey-name">
              名称 <span className="font-normal text-stone-400 dark:text-zinc-600">可选</span>
            </label>
            <input
              id="passkey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="比如：我的 MacBook"
              className={inputCls}
            />
          </div>
          <button type="button" onClick={add} disabled={busy} className={primaryBtn}>
            {busy ? "等待验证…" : "添加通行密钥"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">这个浏览器不支持通行密钥。</p>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
