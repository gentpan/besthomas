"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HTML_LANG, homePath, otherLang, postPath, PROJECTS_SEGMENT, projectsPath, UI, type Lang } from "@/lib/i18n";

/**
 * Fixed link in the top-right corner to the same page in the other language: the projects page, the
 * translated post when one exists (`translated` lists those slugs), otherwise the other language's homepage.
 */
export function LangSwitch({ lang, translated }: { lang: Lang; translated: string[] }) {
  const pathname = usePathname();
  const other = otherLang(lang);
  const prefix = homePath(lang) === "/" ? "/" : `${homePath(lang)}/`;
  const slug = pathname.startsWith(prefix) ? pathname.slice(prefix.length).split("/")[0] : "";
  const href =
    slug === PROJECTS_SEGMENT
      ? projectsPath(other)
      : slug && translated.includes(slug)
        ? postPath(other, slug)
        : homePath(other);

  return (
    <Link href={href} className="lang-switch" lang={HTML_LANG[other]} hrefLang={HTML_LANG[other]} aria-label={UI[lang].switchAria}>
      {UI[lang].switchTo}
    </Link>
  );
}
