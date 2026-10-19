import { OG_SIZE } from "@/lib/og";
import { postOgImage } from "@/lib/og-routes";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return postOgImage("zh", (await params).slug);
}
