import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { getSiteSettings } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return { title: { default: site.zh.name, template: `%s · ${site.zh.name}` }, openGraph: { siteName: site.zh.name, locale: "zh_CN" } };
}

export default function ChineseLayout({ children }: LayoutProps<"/">) {
  return <SiteShell lang="zh">{children}</SiteShell>;
}
