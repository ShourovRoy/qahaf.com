"use server";

import { z } from "zod";
import { getUser } from "@/lib/session";
import { createUploadUrl } from "@/lib/r2";

const schema = z.object({
  purpose: z.enum(["product", "category", "site", "review"]),
  contentType: z.string(),
  size: z.number().int().positive(),
});

export type UploadTicket = { ok: true; url: string; key: string; kind: "image" | "video" } | { ok: false; error: string };

export async function requestUpload(input: z.infer<typeof schema>): Promise<UploadTicket> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { purpose, contentType, size } = parsed.data;

  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (purpose !== "review" && user.role !== "admin") return { ok: false, error: "Not allowed." };

  const folder = { product: "products", category: "categories", site: "site", review: `reviews/${user.id}` }[purpose];
  try {
    const { url, key, kind } = await createUploadUrl(folder, contentType, size);
    return { ok: true, url, key, kind };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}
