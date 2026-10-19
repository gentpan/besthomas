import "server-only";
import fs from "node:fs/promises";
import type { Lang } from "./i18n";
import { DATA_DIR, LIKES_FILE } from "./paths";

// Like counts live in data/likes.json as { "<lang>/<slug>": count }. The file is loaded once and kept in
// memory; every change is written through, one at a time, so concurrent clicks never lose an update.

type Ref = { lang: Lang; slug: string };
const keyOf = ({ lang, slug }: Ref) => `${lang}/${slug}`;

let store: Promise<Map<string, number>> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function load(): Promise<Map<string, number>> {
  store ??= fs
    .readFile(LIKES_FILE, "utf8")
    .then((raw) => {
      const counts = new Map<string, number>();
      for (const [key, value] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) {
        // Keys without a language prefix come from before the site was bilingual; they were Chinese posts.
        if (Number.isInteger(value) && (value as number) > 0) counts.set(key.includes("/") ? key : `zh/${key}`, value as number);
      }
      return counts;
    })
    .catch(() => new Map<string, number>());
  return store;
}

async function persist(counts: Map<string, number>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${LIKES_FILE}.${process.pid}.tmp`;
  const sorted = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(tmp, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  await fs.rename(tmp, LIKES_FILE);
}

function mutate<T>(change: (counts: Map<string, number>) => T): Promise<T> {
  const run = queue.then(async () => {
    const counts = await load();
    const result = change(counts);
    await persist(counts);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function getLikes(ref: Ref): Promise<number> {
  return (await load()).get(keyOf(ref)) ?? 0;
}

/** Look up a post's count with likesFor(map, post). */
export async function getAllLikes(): Promise<Map<string, number>> {
  return new Map(await load());
}

export const likesFor = (counts: Map<string, number>, ref: Ref) => counts.get(keyOf(ref)) ?? 0;

/** Add (+1) or remove (-1) a like; returns the new count. */
export function changeLikes(ref: Ref, delta: 1 | -1): Promise<number> {
  return mutate((counts) => {
    const key = keyOf(ref);
    const next = Math.max(0, (counts.get(key) ?? 0) + delta);
    if (next) counts.set(key, next);
    else counts.delete(key);
    return next;
  });
}

/** Keep the count when a post's slug or language changes. */
export function moveLikes(from: Ref, to: Ref): Promise<void> {
  return mutate((counts) => {
    const n = counts.get(keyOf(from));
    counts.delete(keyOf(from));
    if (n) counts.set(keyOf(to), n);
    else counts.delete(keyOf(to));
  });
}

export function clearLikes(ref: Ref): Promise<void> {
  return mutate((counts) => {
    counts.delete(keyOf(ref));
  });
}
