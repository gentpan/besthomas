import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "bh_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

function secret(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  // Derived from the password by default, so changing the password signs everyone out.
  return process.env.SESSION_SECRET || createHash("sha256").update(`besthomas-session:${password}`).digest("hex");
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password) && safeEqual(input, password!);
}

/** Log the visitor in: set the signed session cookie. Used by both password and passkey login. */
export async function startSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

function createSessionToken(): string {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE);
  return `${expires}.${sign(expires)}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token || !adminConfigured()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) * 1000 < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// Simple in-memory brute-force guard for the login endpoint (single server process).
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function loginBlocked(ip: string): boolean {
  const entry = attempts.get(ip);
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= MAX_ATTEMPTS);
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count++;
}

export function clearFailedLogins(ip: string) {
  attempts.delete(ip);
}
