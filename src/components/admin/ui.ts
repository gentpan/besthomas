/** Shared Tailwind class strings for the admin panel. */

export const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-[15px] text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-3 focus:ring-stone-200/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-500 dark:focus:ring-zinc-800";

export const labelCls = "mb-1.5 block text-[13px] font-medium text-stone-600 dark:text-zinc-400";

export const hintCls = "mt-1.5 text-[12.5px] leading-relaxed text-stone-500 dark:text-zinc-500";

const btn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const primaryBtn = `${btn} bg-stone-800 text-white hover:bg-stone-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white`;

export const secondaryBtn = `${btn} border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;

export const dangerBtn = `${btn} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-rose-950/40`;

export const ghostBtn = `${btn} text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`;

export const cardCls = "rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60";
