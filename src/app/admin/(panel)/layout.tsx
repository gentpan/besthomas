import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { isAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "后台", robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAdmin())) redirect("/admin/login");
  const site = await getSiteSettings();

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-800 dark:bg-zinc-950 dark:text-zinc-200">
      <AdminNav siteName={site.zh.name} />
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">{children}</div>
    </div>
  );
}
