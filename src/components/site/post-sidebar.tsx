"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HTML_LANG, homePath, UI, type Lang } from "@/lib/i18n";
import type { TocItem } from "@/lib/markdown";

/** A heading counts as "being read" once its top passes this far below the top of the window. */
const ACTIVE_OFFSET = 140;

/**
 * Left column on wide screens (CSS shows it from 1280px): Home link, the article's contents with the
 * current section highlighted, and a back-to-top button that appears after scrolling. Rendered into
 * <body> by ArticleExtras, so position: fixed is relative to the window.
 */
export function PostSidebar({ lang, toc }: { lang: Lang; toc: TocItem[] }) {
  const t = UI[lang];
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = item.id;
      }
      // At the very bottom the last section is the one being read, even if its heading is low on screen.
      if (toc.length && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = toc[toc.length - 1].id;
      }
      setActive(current);
      setScrolled(window.scrollY > window.innerHeight * 0.6);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [toc]);

  const go = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  };

  return (
    <>
      <aside className="post-sidebar" lang={HTML_LANG[lang]}>
        <Link href={homePath(lang)} className="post-sidebar-home">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3.5 2.5 7 6 10.5M3 7h6.5a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.home}
        </Link>
        {toc.length > 0 && (
          <nav className="post-toc" aria-label={t.contents}>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-level={item.level}
                aria-current={active === item.id ? "location" : undefined}
                onClick={(e) => go(e, item.id)}
              >
                {item.text}
              </a>
            ))}
          </nav>
        )}
      </aside>
      <button
        type="button"
        className="back-to-top"
        lang={HTML_LANG[lang]}
        data-visible={scrolled || undefined}
        tabIndex={scrolled ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t.backToTop}
      </button>
    </>
  );
}
