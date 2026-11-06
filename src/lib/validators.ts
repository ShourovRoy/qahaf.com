import { z } from "zod";
import { BD_DIVISIONS, POSTCODE } from "./bd-geo";
import { normalizeBdPhone } from "./phone";

export const bdPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const phone = normalizeBdPhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Bangladeshi mobile number (e.g. 01712-345678)." });
      return z.NEVER;
    }
    return phone;
  });

export const addressSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter the recipient's name.").max(80),
    phone: bdPhone,
    division: z.string().refine((d) => d in BD_DIVISIONS, "Choose a division."),
    district: z.string().min(1, "Choose a district."),
    area: z.string().trim().min(2, "Enter your area / thana.").max(80),
    addressLine: z.string().trim().min(5, "Enter your full address.").max(250),
    postcode: z.string().trim().regex(POSTCODE, "Postcode must be 4 digits."),
  })
  .refine((a) => BD_DIVISIONS[a.division]?.includes(a.district), { path: ["district"], message: "Choose a district in this division." });

export type AddressInput = z.infer<typeof addressSchema>;

export type FieldErrors = Record<string, string[] | undefined>;
export type FormState = { error?: string; success?: string; fieldErrors?: FieldErrors } | null;

export function formToObject(fd: FormData) {
  return Object.fromEntries(Array.from(fd.keys()).map((k) => [k, fd.get(k)]));
}
