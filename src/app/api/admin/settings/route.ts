import { adminRoute, json, readJson } from "@/lib/api";
import { getSiteSettings, saveSiteSettings, type SiteSettings } from "@/lib/site";

export const GET = adminRoute(async () => json({ settings: await getSiteSettings() }));

export const PUT = adminRoute(async (req) => {
  const settings = await saveSiteSettings(await readJson<Partial<SiteSettings>>(req));
  return json({ settings });
});
