import { adminRoute, json } from "@/lib/api";
import { listPasskeys } from "@/lib/passkeys";

export const GET = adminRoute(async () => json({ passkeys: await listPasskeys() }));
