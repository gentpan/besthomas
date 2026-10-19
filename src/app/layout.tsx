import type { Metadata, Viewport } from "next";
import "inter-ui/inter-variable.css";
import "@fontsource-variable/crimson-pro/wght.css";
import "@fontsource/noto-serif-sc/400.css";
import "./globals.css";
import { SITE_URL } from "@/lib/paths";
import { getSiteSettings } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: site.zh.name,
    description: site.zh.description,
    openGraph: { type: "website" },
    // Large preview card on X; the image itself comes from the opengraph-image routes.
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
