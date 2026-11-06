import "server-only";
import { z } from "zod";

const schema = z.object({
  POSTGRESQL_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_EMAIL: z.string().email(),
  SMTP_PASSWORD: z.string(),

  R3_S3_ACCESS_KEY_ID: z.string(),
  R3_S3_SECRET_ACCESS_KEY: z.string(),
  R3_S3_CLIENT_URL: z.string().url(),
  R3_S3_BUCKET_NAME: z.string(),
  R3_S3_domain: z.string().url(),
});

let cached: z.infer<typeof schema> | undefined;

// Parsed lazily so `next build` doesn't need every secret.
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
