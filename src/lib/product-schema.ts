import { z } from "zod";

const money = z.coerce.number().int("Use whole taka.").min(0);

export const productInput = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Name is required.").max(120),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
    categoryId: z.string().uuid().nullable(),
    shortDescription: z.string().trim().min(10, "Add a short description (10+ characters).").max(300),
    description: z.string().trim().max(5000).nullable(),
    regularPrice: money.min(1, "Regular price is required."),
    salePrice: money.nullable(),
    fabric: z.string().trim().max(200).nullable(),
    careInstructions: z.string().trim().max(1000).nullable(),
    status: z.enum(["draft", "active", "archived"]),
    isFeatured: z.boolean(),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000),
    seoTitle: z.string().trim().max(70).nullable(),
    seoDescription: z.string().trim().max(170).nullable(),
    sizeChart: z
      .object({
        unit: z.enum(["inch", "cm"]),
        columns: z.array(z.string().trim().min(1).max(30)).max(8),
        rows: z.array(z.object({ size: z.string().trim().min(1).max(20), values: z.array(z.string().trim().max(20)) })).max(15),
      })
      .nullable(),
    variants: z
      .array(
        z.object({
          id: z.string().uuid().optional(),
          size: z.string().trim().min(1, "Size is required.").max(20),
          color: z.string().trim().max(30).nullable(),
          sku: z.string().trim().min(1, "SKU is required.").max(60),
          stock: z.coerce.number().int().min(0, "Stock can't be negative."),
        }),
      )
      .min(1, "Add at least one size."),
    media: z
      .array(z.object({ key: z.string().regex(/^products\//), type: z.enum(["image", "video"]), alt: z.string().max(150).nullable().optional() }))
      .max(15),
  })
  .refine((p) => p.salePrice == null || p.salePrice < p.regularPrice, { path: ["salePrice"], message: "Sale price must be below the regular price." })
  .refine((p) => new Set(p.variants.map((v) => `${v.size}|${v.color ?? ""}`)).size === p.variants.length, {
    path: ["variants"],
    message: "Each size/colour combination must be unique.",
  })
  .refine((p) => new Set(p.variants.map((v) => v.sku.toUpperCase())).size === p.variants.length, { path: ["variants"], message: "SKUs must be unique." })
  .refine((p) => p.status !== "active" || p.media.some((m) => m.type === "image"), { path: ["media"], message: "Add at least one image before publishing." });

export type ProductInput = z.infer<typeof productInput>;
