"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/i18n";
import type { TocItem } from "@/lib/markdown";
import { Lightbox } from "./lightbox";
import { PostSidebar } from "./post-sidebar";

const noop = () => () => {};

/**
 * Article-page extras: the left sidebar (Home, contents, back to top) and the image viewer.
 * They are rendered into <body>, outside the paper sheet, whose entrance transform would otherwise
 * make position: fixed relative to the sheet instead of the window.
 */
export function ArticleExtras({ lang, toc }: { lang: Lang; toc: TocItem[] }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <>
      <PostSidebar lang={lang} toc={toc} />
      <Lightbox lang={lang} />
    </>,
    document.body,
  );
}
