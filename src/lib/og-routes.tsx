import "server-only";
import { UI, type Lang } from "./i18n";
import { ogImage } from "./og";
import { getPost } from "./posts";
import { getSiteSettings } from "./site";

/** Share image for a language's homepage: the site name on the sheet. */
export async function homeOgImage(lang: Lang) {
  const site = await getSiteSettings();
  return ogImage({ heading: site[lang].name });
}

/** Share image for a post: its title, with the site name above. Drafts and missing posts get the homepage image. */
export async function postOgImage(lang: Lang, slug: string) {
  const [site, post] = await Promise.all([getSiteSettings(), getPost(lang, slug)]);
  if (!post || post.draft) return ogImage({ heading: site[lang].name });
  return ogImage({ heading: post.title, kicker: site[lang].name });
}

/** Share image for the projects page: "Projects", with the site name above. */
export async function projectsOgImage(lang: Lang) {
  const site = await getSiteSettings();
  return ogImage({ heading: UI[lang].projects, kicker: site[lang].name });
}
