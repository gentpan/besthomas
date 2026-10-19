const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Today as YYYY-MM-DD in the given IANA timezone. */
export function today(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

/** Coerce frontmatter date values (Date objects from YAML, or loose strings) to YYYY-MM-DD. */
export function normalizeDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim();
  const m = /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/.exec(s);
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return isValidDate(iso) ? iso : null;
}

export function formatListDate(date: string, style: "full" | "year"): string {
  return style === "year" ? date.slice(0, 4) : date.replaceAll("-", ".");
}
