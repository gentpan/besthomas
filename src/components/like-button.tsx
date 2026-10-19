"use client";

import { useState, useSyncExternalStore } from "react";
import { UI, type Lang } from "@/lib/i18n";

// Whether this browser has liked a post is remembered in localStorage (there are no accounts).
const storageKey = (key: string) => `bh:liked:${key}`;
const CHANGE_EVENT = "bh-liked-change";

function readLiked(key: string): boolean {
  try {
    return localStorage.getItem(storageKey(key)) === "1";
  } catch {
    return false;
  }
}

function writeLiked(key: string, liked: boolean) {
  try {
    if (liked) localStorage.setItem(storageKey(key), "1");
    else localStorage.removeItem(storageKey(key));
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function LikeButton({ lang, slug, initialCount }: { lang: Lang; slug: string; initialCount: number }) {
  // Chinese keys keep the plain slug so likes recorded before the English version existed still count.
  const key = lang === "zh" ? slug : `${lang}/${slug}`;
  const t = UI[lang];
  const liked = useSyncExternalStore(subscribe, () => readLiked(key), () => false);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [pops, setPops] = useState(0);

  async function toggle() {
    if (pending) return;
    const next = !liked;
    // Optimistic: flip immediately, reconcile with the server's count.
    writeLiked(key, next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) setPops((n) => n + 1);
    setPending(true);
    try {
      const res = await fetch(`/api/likes/${lang}/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: next }),
      });
      const data = (await res.json().catch(() => null)) as { count?: number } | null;
      if (typeof data?.count === "number") setCount(data.count);
      if (!res.ok) writeLiked(key, !next);
    } catch {
      writeLiked(key, !next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="like"
      aria-pressed={liked}
      aria-label={liked ? t.likedAria(count) : t.likeAria(count)}
      onClick={toggle}
    >
      <svg key={pops} className={pops ? "pop" : undefined} viewBox="0 0 24 24" aria-hidden="true">
        <path
          className="heart-fill"
          d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.8 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.4 0 5.6 3.2 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"
        />
        <path
          className="heart-line"
          d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.8 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.4 0 5.6 3.2 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"
        />
      </svg>
      <span>{count > 0 ? count : t.like}</span>
    </button>
  );
}
