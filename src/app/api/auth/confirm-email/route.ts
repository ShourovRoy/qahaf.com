import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { consumeLinkToken } from "@/lib/auth";

// Link sent to the new address when someone changes their email.
export async function GET(request: NextRequest) {
  const link = await consumeLinkToken("change-email", request.nextUrl.searchParams.get("token") ?? "");
  const fail = NextResponse.redirect(new URL("/account/profile?email=invalid", request.url));
  if (!link?.extra) return fail;

  const taken = await db.query.user.findFirst({ where: and(eq(user.email, link.extra), ne(user.id, link.userId)), columns: { id: true } });
  if (taken) return fail;
  await db.update(user).set({ email: link.extra, emailVerified: true }).where(eq(user.id, link.userId));
  return NextResponse.redirect(new URL("/account/profile?email=changed", request.url));
}
