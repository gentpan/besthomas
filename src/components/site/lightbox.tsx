"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HTML_LANG, UI, type Lang } from "@/lib/i18n";

type Shot = { el: HTMLImageElement; src: string; alt: string; caption: string };

const FILE_NAME = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

/** Every image in the article body (except linked ones), with the caption to show under it. */
function collectShots(): Shot[] {
  return [...document.querySelectorAll<HTMLImageElement>(".article-body img")]
    .filter((img) => !img.closest("a"))
    .map((el) => {
      const figure = el.closest("figure");
      const figureCaption = figure?.querySelector("figcaption")?.textContent?.trim() ?? "";
      const alone = (figure?.querySelectorAll("img").length ?? 0) === 1;
      const alt = el.alt.trim();
      const caption = (alone && figureCaption) || (alt && !FILE_NAME.test(alt) ? alt : "") || figureCaption;
      return { el, src: el.currentSrc || el.src, alt, caption };
    });
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** CSS transform that makes a box at `box` look like it sits at `target`. */
function transformTo(target: DOMRect, box: DOMRect) {
  const dx = target.left + target.width / 2 - (box.left + box.width / 2);
  const dy = target.top + target.height / 2 - (box.top + box.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${target.width / box.width})`;
}

const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Click an article image to view it large: it grows out of its place in the text, with its caption
 * below and ← → buttons to step through the article's other images. Arrow keys and swipes also work;
 * Esc, a click or a tap closes it. Rendered into <body> by ArticleExtras.
 */
export function Lightbox({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const justSwiped = useRef(false);

  // Turn the article's images into buttons that open the viewer.
  useEffect(() => {
    const found = collectShots();
    const cleanups = found.map((shot, i) => {
      const open = () => {
        setShots(collectShots());
        setDirection(0);
        setClosing(false);
        setIndex(i);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      };
      shot.el.classList.add("zoomable");
      shot.el.tabIndex = 0;
      shot.el.setAttribute("role", "button");
      shot.el.setAttribute("aria-label", shot.caption ? `${t.viewImage} · ${shot.caption}` : t.viewImage);
      shot.el.addEventListener("click", open);
      shot.el.addEventListener("keydown", onKey);
      return () => {
        shot.el.removeEventListener("click", open);
        shot.el.removeEventListener("keydown", onKey);
      };
    });
    return () => cleanups.forEach((off) => off());
  }, [t.viewImage]);

  const isOpen = index !== null;
  const current = index !== null ? shots[index] : undefined;

  // Grow out of the clicked image when opening.
  useEffect(() => {
    if (!current || direction !== 0 || closing || reducedMotion()) return;
    const img = image.current;
    if (!img) return;
    const run = () => {
      const box = img.getBoundingClientRect();
      if (!box.width) return;
      img.animate([{ transform: transformTo(current.el.getBoundingClientRect(), box) }, { transform: "none" }], {
        duration: 420,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
    };
    if (img.complete) run();
    else img.addEventListener("load", run, { once: true });
  }, [current, direction, closing]);

  const close = useCallback(() => {
    if (!current || closing) return;
    setClosing(true);
    const done = () => {
      setIndex(null);
      setClosing(false);
      current.el.focus({ preventScroll: true });
    };
    const img = image.current;
    if (!img || reducedMotion()) return void setTimeout(done, 150);
    const target = current.el.getBoundingClientRect();
    const onScreen = target.bottom > 0 && target.top < window.innerHeight && target.width > 0;
    // Shrink back into place when the original is on screen, otherwise just fade.
    const animation = onScreen
      ? img.animate([{ transform: "none" }, { transform: transformTo(target, img.getBoundingClientRect()) }], {
          duration: 320,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        })
      : img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
    animation.onfinish = done;
  }, [current, closing]);

  const step = useCallback(
    (by: -1 | 1) => {
      if (index === null || closing) return;
      const next = index + by;
      if (next < 0 || next >= shots.length) return;
      setDirection(by);
      setIndex(next);
    },
    [index, closing, shots.length],
  );

  // Keyboard, scroll lock and focus while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, step]);

  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = previous;
    };
  }, [isOpen]);

  // Load the neighbours ahead of time so stepping through is instant.
  useEffect(() => {
    if (index === null) return;
    for (const j of [index - 1, index + 1]) {
      if (shots[j]) new Image().src = shots[j].src;
    }
  }, [index, shots]);

  if (index === null || !current) return null;

  return (
    <div
      ref={dialog}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t.imageViewer}
      tabIndex={-1}
      lang={HTML_LANG[lang]}
      data-closing={closing || undefined}
      onPointerDown={(e) => {
        touchStart.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
          justSwiped.current = true;
          step(dx < 0 ? 1 : -1);
        }
      }}
      onClick={(e) => {
        if (justSwiped.current) {
          justSwiped.current = false;
          return;
        }
        if (!(e.target as HTMLElement).closest(".lightbox-nav")) close();
      }}
    >
      <figure className="lightbox-figure">
        {/* eslint-disable-next-line @next/next/no-img-element -- same file the article already shows */}
        <img
          key={index}
          ref={image}
          className="lightbox-img"
          data-direction={direction || undefined}
          src={current.src}
          alt={current.alt}
          draggable={false}
        />
        {current.caption && <figcaption className="lightbox-caption">{current.caption}</figcaption>}
      </figure>
      {shots.length > 1 && (
        <div className="lightbox-nav">
          <button type="button" onClick={() => step(-1)} disabled={index === 0} aria-label={t.prevImage}>
            <Arrow flip />
          </button>
          <button type="button" onClick={() => step(1)} disabled={index === shots.length - 1} aria-label={t.nextImage}>
            <Arrow />
          </button>
        </div>
      )}
    </div>
  );
}
