import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readSession } from "./auth";

export const getSession = cache(readSession);

export async function getUser() {
  return (await getSession())?.user ?? null;
}

export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

// For server actions: throw instead of redirecting.
export async function assertAdmin() {
  const user = await getUser();
  if (user?.role !== "admin") throw new Error("Unauthorized");
  return user;
}
