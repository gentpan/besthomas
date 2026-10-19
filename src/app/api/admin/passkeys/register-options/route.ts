import { adminRoute, json } from "@/lib/api";
import { registrationOptions } from "@/lib/passkeys";

/** Step 1 of adding a passkey (admin only): options for navigator.credentials.create(). */
export const POST = adminRoute(async () => json(await registrationOptions()));
