import { OG_SIZE } from "@/lib/og";
import { homeOgImage } from "@/lib/og-routes";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "besthomas.com";

export default function Image() {
  return homeOgImage("zh");
}
