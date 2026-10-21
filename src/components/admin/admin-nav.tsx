"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "文章", match: (p: string) => p === "/admin" || p.startsWith("/admin/posts") },
  { href: "/admin/projects", label: "项目", match: (p: string) => p.startsWith("/admin/projects") },
  { href: "/admin/import", label: "导入 Markdown", match: (p: string) => p.startsWith("/admin/import") },
  { href: "/admin/settings", label: "站点设置", match: (p: string) => p.startsWith("/admin/settings") },
];

export function AdminNav({ siteName }: { siteName: string }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link href="/admin" className="shrink-0 font-serif text-[19px] text-stone-700 dark:text-zinc-200">
          {siteName}
          <span className="ml-2 font-sans text-xs text-stone-400 dark:text-zinc-500">后台</span>
        </Link>
        <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition ${
                l.match(pathname)
                  ? "bg-stone-200/70 font-medium text-stone-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <a
          href="/"
          target="_blank"
          className="hidden text-sm text-stone-500 hover:text-stone-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          查看网站 ↗
        </a>
        <button
          type="button"
          onClick={logout}
          className="cursor-pointer text-sm text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          退出
        </button>
      </div>
    </header>
  );
}
