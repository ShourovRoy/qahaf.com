import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, like, or, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { session, user, verification } from "@/db/schema";
import { SESSION_COOKIE } from "./auth-cookie";

const DAY = 60 * 60 * 24;
const REMEMBER_FOR = 30 * DAY;

/* ---------- Passwords ---------- */

// scrypt with a hex salt, stored as "salt:key". Same format the old auth library used, so existing passwords still work.
function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await deriveKey(password, salt)).toString("hex")}`;
}

export async function verifyPassword(stored: string | null, password: string) {
  // Unknown accounts still pay for a hash, so response time doesn't reveal which emails exist.
  const [salt, key] = (stored ?? `${"0".repeat(32)}:${"0".repeat(128)}`).split(":");
  const derived = await deriveKey(password, salt);
  return stored != null && timingSafeEqual(derived, Buffer.from(key, "hex"));
}

/* ---------- Tokens ---------- */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

/* ---------- Sessions ---------- */

export async function createSession(userId: string, remember = true) {
  const token = newToken();
  const h = await headers();
  await db.insert(session).values({
    id: randomUUID(),
    token: sha256(token),
    userId,
    // A session-only cookie still needs a server-side end.
    expiresAt: new Date(Date.now() + (remember ? REMEMBER_FOR : DAY) * 1000),
    ipAddress: h.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    userAgent: h.get("user-agent"),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember && { maxAge: REMEMBER_FOR }),
  });
}

export async function readSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      sessionId: session.id,
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(and(eq(session.token, sha256(token)), gt(session.expiresAt, sql`now()`)))
    .limit(1);
  if (!row || row.isBlocked) return null;
  const { sessionId, ...sessionUser } = row;
  return { sessionId, user: sessionUser };
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof readSession>>>["user"];

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(session).where(eq(session.token, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/* ---------- One-time links (verify email, reset password, change email) ---------- */

type Purpose = "verify-email" | "reset-password" | "change-email";

// identifier is "<purpose>:<userId>[:<extra>]"; only the token's hash is stored.
export async function issueLinkToken(purpose: Purpose, userId: string, ttlSeconds: number, extra?: string) {
  const token = newToken();
  const prefix = `${purpose}:${userId}`;
  await db.transaction(async (tx) => {
    // One live link per purpose: a new email invalidates the old one.
    await tx.delete(verification).where(or(eq(verification.identifier, prefix), like(verification.identifier, `${prefix}:%`)));
    await tx.insert(verification).values({
      id: randomUUID(),
      identifier: extra ? `${prefix}:${extra}` : prefix,
      value: sha256(token),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
  });
  return token;
}

export async function consumeLinkToken(purpose: Purpose, token: string) {
  const [row] = await db
    .delete(verification)
    .where(and(eq(verification.value, sha256(token)), gt(verification.expiresAt, sql`now()`)))
    .returning({ identifier: verification.identifier });
  if (!row) return null;
  const [p, userId, ...rest] = row.identifier.split(":");
  if (p !== purpose) return null;
  return { userId, extra: rest.join(":") || undefined };
}

/* ---------- Rate limit ---------- */

// Per-instance memory: enough to slow down password guessing on one server.
const hits = new Map<string, { count: number; reset: number }>();

export async function rateLimited(action: string, max = 10, windowSeconds = 60) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${action}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > max;
}
