import { adminRoute, json, readJson } from "@/lib/api";
import { getProjects, saveProjects } from "@/lib/projects";

export const GET = adminRoute(async () => json({ projects: await getProjects() }));

export const PUT = adminRoute(async (req) => json({ projects: await saveProjects(await readJson<unknown>(req)) }));
