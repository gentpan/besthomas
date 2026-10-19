import type { CSSProperties } from "react";

/** Inline style for the staggered `.rise` entrance animation. */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
