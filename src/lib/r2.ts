import "server-only";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

let client: S3Client | undefined;

function s3() {
  const e = env();
  // R2 needs "auto"; R3_S3_REGION is only a location hint.
  client ??= new S3Client({
    region: "auto",
    endpoint: e.R3_S3_CLIENT_URL,
    credentials: { accessKeyId: e.R3_S3_ACCESS_KEY_ID, secretAccessKey: e.R3_S3_SECRET_ACCESS_KEY },
  });
  return client;
}

export const UPLOAD_RULES = {
  image: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 10 * 1024 * 1024 },
  video: { types: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 100 * 1024 * 1024 },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function uploadKindFor(contentType: string): UploadKind | null {
  if ((UPLOAD_RULES.image.types as readonly string[]).includes(contentType)) return "image";
  if ((UPLOAD_RULES.video.types as readonly string[]).includes(contentType)) return "video";
  return null;
}

export async function createUploadUrl(folder: string, contentType: string, size: number) {
  const kind = uploadKindFor(contentType);
  if (!kind) throw new Error("Unsupported file type.");
  if (size > UPLOAD_RULES[kind].maxBytes) {
    throw new Error(`File is too large (max ${UPLOAD_RULES[kind].maxBytes / 1024 / 1024} MB).`);
  }
  const key = `${folder}/${crypto.randomUUID()}.${EXT[contentType]}`;
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: env().R3_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn: 600 },
  );
  return { url, key, kind };
}

export async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  try {
    await s3().send(
      new DeleteObjectsCommand({
        Bucket: env().R3_S3_BUCKET_NAME,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  } catch (err) {
    console.error("R2 delete failed", err);
  }
}
