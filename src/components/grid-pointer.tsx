"use client";

import { useEffect, useRef } from "react";

/** The grid-paper background; on desktop its lines darken around the pointer. */
export function GridBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!el || !fine.matches) return;

    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--px", `${e.clientX - rect.left}px`);
        el.style.setProperty("--py", `${e.clientY - rect.top}px`);
        el.dataset.active = "true";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.dataset.active = "false";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref} className="grid-bg" aria-hidden="true" />;
}
