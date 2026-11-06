"use server";

import { eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { order } from "@/db/schema";
import { assertAdmin } from "@/lib/session";
import { transitionOrder } from "@/server/orders";

const schema = z.object({
  orderId: z.string().uuid(),
  to: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export async function changeOrderStatus(input: z.infer<typeof schema>) {
  const admin = await assertAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid request." };
  const { orderId, to, note } = parsed.data;
  if ((to === "rejected" || to === "cancelled") && !note) return { ok: false as const, error: "Please give a reason." };

  try {
    const { slugs } = await transitionOrder({ orderId, to, actorId: admin.id, note });
    if (to === "rejected" || to === "cancelled") {
      updateTag("products");
      slugs.forEach((s) => updateTag(`product:${s}`));
    }
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function saveAdminNote(orderId: string, note: string) {
  await assertAdmin();
  await db.update(order).set({ adminNote: note.slice(0, 2000) || null }).where(eq(order.id, orderId));
  refresh();
  return { ok: true as const };
}
