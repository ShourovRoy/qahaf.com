import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { consumeLinkToken, createSession } from "@/lib/auth";

// Link from the verification email: mark the email verified and sign the user in.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const link = await consumeLinkToken("verify-email", params.get("token") ?? "");
  if (!link) return NextResponse.redirect(new URL("/login?error=invalid-link", request.url));

  const [u] = await db.update(user).set({ emailVerified: true }).where(eq(user.id, link.userId)).returning({ isBlocked: user.isBlocked });
  if (!u || u.isBlocked) return NextResponse.redirect(new URL("/login?verified=1", request.url));

  await createSession(link.userId);
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return NextResponse.redirect(new URL(target, request.url));
}
