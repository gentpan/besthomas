import "server-only";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { DATA_DIR, PASSKEYS_FILE, SITE_URL } from "./paths";
import { ContentError } from "./posts";

// Passkeys (WebAuthn) for the single admin account, stored in data/passkeys.json.
// Passkeys are bound to the site's domain (RP ID), taken from SITE_URL: besthomas.com in production,
// localhost in development — a passkey made on one does not work on the other.

const RP_ID = new URL(SITE_URL).hostname;
const ORIGIN = new URL(SITE_URL).origin;
const RP_NAME = "besthomas";

type StoredPasskey = {
  /** Credential ID, base64url */
  id: string;
  /** COSE public key, base64url */
  publicKey: string;
  counter: number;
  transports?: string[];
  name: string;
  /** Synced across devices (e.g. iCloud Keychain) or bound to one device */
  deviceType: "singleDevice" | "multiDevice";
  createdAt: string;
  lastUsedAt: string | null;
};

type Store = { userID: string; passkeys: StoredPasskey[] };

/** What the admin UI gets to see: no key material. */
export type PasskeyInfo = Pick<StoredPasskey, "id" | "name" | "deviceType" | "createdAt" | "lastUsedAt">;

const toInfo = ({ id, name, deviceType, createdAt, lastUsedAt }: StoredPasskey): PasskeyInfo => ({
  id,
  name,
  deviceType,
  createdAt,
  lastUsedAt,
});

let loaded: Promise<Store> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function load(): Promise<Store> {
  loaded ??= fs
    .readFile(PASSKEYS_FILE, "utf8")
    .then((raw) => JSON.parse(raw) as Store)
    .catch(() => ({ userID: randomBytes(32).toString("base64url"), passkeys: [] }));
  return loaded;
}

/** Apply a change and write the file, one change at a time. */
function update<T>(change: (store: Store) => T): Promise<T> {
  const run = queue.then(async () => {
    const store = await load();
    const result = change(store);
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${PASSKEYS_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    await fs.rename(tmp, PASSKEYS_FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

// Challenges are single-use and expire after five minutes.
const CHALLENGE_TTL = 5 * 60 * 1000;
const challenges = new Map<string, { kind: "register" | "login"; expires: number }>();

function rememberChallenge(challenge: string, kind: "register" | "login") {
  const now = Date.now();
  for (const [c, v] of challenges) if (v.expires < now) challenges.delete(c);
  challenges.set(challenge, { kind, expires: now + CHALLENGE_TTL });
}

function consumeChallenge(challenge: string, kind: "register" | "login"): boolean {
  const entry = challenges.get(challenge);
  challenges.delete(challenge);
  return Boolean(entry && entry.kind === kind && entry.expires > Date.now());
}

export async function listPasskeys(): Promise<PasskeyInfo[]> {
  return (await load()).passkeys.map(toInfo);
}

export async function hasPasskeys(): Promise<boolean> {
  return (await load()).passkeys.length > 0;
}

export async function registrationOptions() {
  const store = await load();
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: "admin",
    userDisplayName: `${RP_NAME} 管理员`,
    userID: Buffer.from(store.userID, "base64url"),
    attestationType: "none",
    excludeCredentials: store.passkeys.map((p) => ({ id: p.id, transports: p.transports })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  rememberChallenge(options.challenge, "register");
  return options;
}

export async function registerPasskey(response: RegistrationResponseJSON, name: string): Promise<PasskeyInfo> {
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: (c) => consumeChallenge(c, "register"),
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
  } catch (err) {
    throw new ContentError(`通行密钥验证失败：${(err as Error).message}`);
  }
  if (!verification.verified) throw new ContentError("通行密钥验证失败，请重试");

  const { credential, credentialDeviceType } = verification.registrationInfo;
  return update((store) => {
    if (store.passkeys.some((p) => p.id === credential.id)) throw new ContentError("这个通行密钥已经添加过了", 409);
    const passkey: StoredPasskey = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? response.response.transports,
      name: name.trim().slice(0, 60) || `通行密钥 ${store.passkeys.length + 1}`,
      deviceType: credentialDeviceType,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    store.passkeys.push(passkey);
    return toInfo(passkey);
  });
}

export async function authenticationOptions() {
  // Empty allowCredentials: the browser offers whichever passkey for this site the user has.
  const options = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: "required" });
  rememberChallenge(options.challenge, "login");
  return options;
}

/** Returns true when the response proves possession of one of the admin's passkeys. */
export async function verifyPasskeyLogin(response: AuthenticationResponseJSON): Promise<boolean> {
  const store = await load();
  const passkey = store.passkeys.find((p) => p.id === response.id);
  if (!passkey) return false;

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: (c) => consumeChallenge(c, "login"),
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.id,
        publicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    });
  } catch {
    return false;
  }
  if (!verification.verified) return false;

  await update((s) => {
    const p = s.passkeys.find((x) => x.id === passkey.id);
    if (p) {
      p.counter = verification.authenticationInfo.newCounter;
      p.lastUsedAt = new Date().toISOString();
    }
  });
  return true;
}

export function deletePasskey(id: string): Promise<void> {
  return update((store) => {
    store.passkeys = store.passkeys.filter((p) => p.id !== id);
  });
}
