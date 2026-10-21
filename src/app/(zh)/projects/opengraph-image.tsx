import { OG_SIZE } from "@/lib/og";
import { projectsOgImage } from "@/lib/og-routes";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return projectsOgImage("zh");
}
