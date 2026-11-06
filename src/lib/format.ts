const taka = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });

export function formatPrice(amount: number) {
  return `৳${taka.format(amount)}`;
}

export function effectivePrice(p: { regularPrice: number; salePrice: number | null }) {
  return p.salePrice ?? p.regularPrice;
}

export function discountPercent(p: { regularPrice: number; salePrice: number | null }) {
  if (p.salePrice == null) return 0;
  return Math.round(((p.regularPrice - p.salePrice) / p.regularPrice) * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

export function formatDate(d: Date | string) {
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string) {
  return dateTimeFmt.format(new Date(d));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ratingAverage(p: { ratingSum: number; ratingCount: number }) {
  return p.ratingCount ? Math.round((p.ratingSum / p.ratingCount) * 10) / 10 : 0;
}
