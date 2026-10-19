import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { getSiteSettings } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return { title: { default: site.en.name, template: `%s · ${site.en.name}` }, openGraph: { siteName: site.en.name, locale: "en_US" } };
}

export default function EnglishLayout({ children }: LayoutProps<"/en">) {
  return <SiteShell lang="en">{children}</SiteShell>;
}
