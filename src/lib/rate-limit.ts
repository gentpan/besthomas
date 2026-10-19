import "server-only";

// Fixed-window counters in memory. Good enough for a single server process; resets on restart.
const windows = new Map<string, { count: number; resetAt: number }>();

/** Count one hit for `key`; returns false once `limit` hits have been used within `windowMs`. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (windows.size > 50_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}
