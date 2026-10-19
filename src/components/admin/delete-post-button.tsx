"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { api } from "./request";

export function DeletePostButton({ lang, slug, title, after }: { lang: Lang; slug: string; title: string; after?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm(`确定删除《${title}》吗？删除后无法恢复。`)) return;
    setPending(true);
    try {
      await api(`/api/admin/posts/${lang}/${slug}`, { method: "DELETE" });
      if (after) router.push(after);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="cursor-pointer text-sm text-stone-400 hover:text-rose-700 disabled:opacity-50 dark:text-zinc-500 dark:hover:text-rose-400"
    >
      {pending ? "删除中…" : "删除"}
    </button>
  );
}
