// Client-safe: builds public R2 URLs from stored object keys.
export function mediaUrl(key: string | null | undefined) {
  if (!key) return "/placeholder.svg";
  return `${process.env.NEXT_PUBLIC_MEDIA_URL}/${key}`;
}
