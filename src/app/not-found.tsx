import { NotFoundView } from "@/components/site/not-found-view";
import { SiteShell } from "@/components/site/site-shell";

/** Fallback for URLs that match no route at all (e.g. /a/b). */
export default function NotFound() {
  return (
    <SiteShell lang="zh">
      <NotFoundView lang="zh" />
    </SiteShell>
  );
}
