"use server";

import { and, eq, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { session, user } from "@/db/schema";
import {
  consumeLinkToken,
  createSession,
  destroySession,
  hashPassword,
  issueLinkToken,
  rateLimited,
  verifyPassword,
} from "@/lib/auth";
import { emails, sendMail } from "@/lib/email";
import { normalizeBdPhone } from "@/lib/phone";
import { getSession, getUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";

export type AuthResult = { error?: string; code?: "EMAIL_NOT_VERIFIED" } | undefined;

const TOO_MANY = { error: "Too many attempts. Please wait a minute and try again." };
const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters.");

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

async function sendVerifyEmail(u: { id: string; name: string; email: string }, next?: string) {
  const token = await issueLinkToken("verify-email", u.id, 60 * 60 * 24);
  const url = absoluteUrl(`/api/auth/verify-email?token=${token}&next=${encodeURIComponent(safeNext(next))}`);
  const mail = emails.verify(u.name, url);
  await sendMail(u.email, mail.subject, mail.html);
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email,
  phone: z.string(),
  password,
});

export async function signUp(input: z.input<typeof signUpSchema> & { next?: string }): Promise<AuthResult> {
  if (await rateLimited("sign-up", 5)) return TOO_MANY;
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  const phone = normalizeBdPhone(parsed.data.phone);
  if (!phone) return { error: "Enter a valid Bangladeshi mobile number." };

  const existing = await db.query.user.findFirst({ where: eq(user.email, email), columns: { id: true } });
  if (existing) return { error: "An account with this email already exists." };
  const phoneTaken = await db.query.user.findFirst({ where: eq(user.phone, phone), columns: { id: true } });
  if (phoneTaken) return { error: "This phone number is already registered." };

  const id = randomUUID();
  await db.insert(user).values({ id, name, email, phone, passwordHash: await hashPassword(password) });
  try {
    await sendVerifyEmail({ id, name, email }, input.next);
  } catch (err) {
    console.error("verification email failed", err);
    return { error: "Your account was created, but we couldn't send the verification email. Sign in to get a new link." };
  }
}

export async function signIn(input: { email: string; password: string; remember: boolean; next?: string }): Promise<AuthResult> {
  if (await rateLimited("sign-in")) return TOO_MANY;
  const found = await db.query.user.findFirst({ where: eq(user.email, input.email.trim().toLowerCase()) });
  const ok = await verifyPassword(found?.passwordHash ?? null, input.password);
  if (!found || !ok) return { error: "Invalid email or password." };
  if (found.isBlocked) return { error: "This account has been suspended." };
  if (!found.emailVerified) {
    await sendVerifyEmail(found, input.next).catch((err) => console.error("verification email failed", err));
    return { code: "EMAIL_NOT_VERIFIED" };
  }
  await createSession(found.id, input.remember);
}

export async function signOut() {
  await destroySession();
}

export async function requestPasswordReset(input: { email: string }): Promise<AuthResult> {
  if (await rateLimited("reset", 5)) return TOO_MANY;
  const found = await db.query.user.findFirst({ where: eq(user.email, input.email.trim().toLowerCase()) });
  // Same answer whether or not the account exists.
  if (!found || found.isBlocked) return;
  const token = await issueLinkToken("reset-password", found.id, 60 * 60);
  const mail = emails.resetPassword(found.name, absoluteUrl(`/reset-password?token=${token}`));
  await sendMail(found.email, mail.subject, mail.html);
}

export async function resetPassword(input: { token: string; password: string }): Promise<AuthResult> {
  if (await rateLimited("reset", 5)) return TOO_MANY;
  const parsed = password.safeParse(input.password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const link = await consumeLinkToken("reset-password", input.token);
  if (!link) return { error: "This reset link is invalid or has expired." };
  await db.transaction(async (tx) => {
    // The link proves they own the inbox, so the email counts as verified too.
    await tx.update(user).set({ passwordHash: await hashPassword(parsed.data), emailVerified: true }).where(eq(user.id, link.userId));
    await tx.delete(session).where(eq(session.userId, link.userId));
  });
}

export async function changePassword(input: { current: string; next: string }): Promise<AuthResult> {
  const current = await getSession();
  if (!current) return { error: "Please sign in." };
  if (await rateLimited("change-password", 5)) return TOO_MANY;
  const parsed = password.safeParse(input.next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const row = await db.query.user.findFirst({ where: eq(user.id, current.user.id), columns: { passwordHash: true } });
  if (!(await verifyPassword(row?.passwordHash ?? null, input.current))) return { error: "Your current password is incorrect." };
  await db.transaction(async (tx) => {
    await tx.update(user).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(user.id, current.user.id));
    await tx.delete(session).where(and(eq(session.userId, current.user.id), ne(session.id, current.sessionId)));
  });
}

export async function changeEmail(input: { email: string }): Promise<AuthResult> {
  const me = await getUser();
  if (!me) return { error: "Please sign in." };
  if (await rateLimited("change-email", 5)) return TOO_MANY;
  const parsed = email.safeParse(input.email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data === me.email) return { error: "That's already your email." };
  const taken = await db.query.user.findFirst({ where: eq(user.email, parsed.data), columns: { id: true } });
  if (taken) return { error: "An account with this email already exists." };
  const token = await issueLinkToken("change-email", me.id, 60 * 60, parsed.data);
  const mail = emails.changeEmail(me.name, parsed.data, absoluteUrl(`/api/auth/confirm-email?token=${token}`));
  await sendMail(parsed.data, mail.subject, mail.html);
}
