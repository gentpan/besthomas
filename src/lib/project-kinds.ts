/** Project types and shapes shared by the site and the admin panel. Safe to import from client code. */

export const PROJECT_KINDS = ["website", "app", "extension", "other"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const isProjectKind = (value: unknown): value is ProjectKind => PROJECT_KINDS.includes(value as ProjectKind);

/** Chinese and English text; the English page falls back to the Chinese text when the English is empty. */
export type Bilingual = { zh: string; en: string };

export type Project = {
  id: string;
  kind: ProjectKind;
  name: Bilingual;
  /** One or two sentences, plain text. */
  description: Bilingual;
  /** Free text, e.g. "2025" or "2023 – 2025". */
  year: string;
  /** The website, store page or download page. */
  url: string;
  /** Source code, e.g. a GitHub repository. */
  source: string;
  /** An uploaded image (/uploads/…) or an https:// address. */
  icon: string;
  /** Kept in the admin panel but not shown on the site. */
  hidden: boolean;
};

export type ProjectsData = {
  /** Markdown shown under the page title. */
  intro: Bilingual;
  /** In display order. The site groups them by kind, groups ordered by their first project. */
  items: Project[];
};
