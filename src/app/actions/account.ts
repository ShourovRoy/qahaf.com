"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { address, user as userTable } from "@/db/schema";
import { getUser } from "@/lib/session";
import { addressSchema, bdPhone, formToObject, type FormState } from "@/lib/validators";

const profileSchema = z.object({ name: z.string().trim().min(2, "Enter your full name.").max(80), phone: bdPhone });

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please sign in." };
  const parsed = profileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, phone } = parsed.data;
  const taken = await db.query.user.findFirst({ where: and(eq(userTable.phone, phone), ne(userTable.id, user.id)), columns: { id: true } });
  if (taken) return { fieldErrors: { phone: ["This phone number is already registered."] } };
  try {
    await db.update(userTable).set({ name, phone }).where(eq(userTable.id, user.id));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update profile." };
  }
  refresh();
  return { success: "Profile updated." };
}

export async function saveAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Please sign in." };
  const parsed = addressSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const label = String(fd.get("label") ?? "").trim().slice(0, 30) || "Home";
  const id = String(fd.get("id") ?? "");
  const makeDefault = fd.get("isDefault") === "on";

  await db.transaction(async (tx) => {
    const count = await tx.$count(address, eq(address.userId, user.id));
    const isDefault = makeDefault || count === 0;
    if (isDefault) await tx.update(address).set({ isDefault: false }).where(eq(address.userId, user.id));
    if (id) {
      await tx.update(address).set({ ...parsed.data, label, ...(isDefault && { isDefault }) }).where(and(eq(address.id, id), eq(address.userId, user.id)));
    } else {
      await tx.insert(address).values({ ...parsed.data, label, userId: user.id, isDefault });
    }
  });
  refresh();
  return { success: "Address saved." };
}

export async function deleteAddress(id: string) {
  const user = await getUser();
  if (!user) return;
  await db.delete(address).where(and(eq(address.id, id), eq(address.userId, user.id)));
  refresh();
}

export async function setDefaultAddress(id: string) {
  const user = await getUser();
  if (!user) return;
  await db.transaction(async (tx) => {
    await tx.update(address).set({ isDefault: false }).where(eq(address.userId, user.id));
    await tx.update(address).set({ isDefault: true }).where(and(eq(address.id, id), eq(address.userId, user.id)));
  });
  refresh();
}
