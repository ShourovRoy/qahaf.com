import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";

export type StoreSettings = {
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  // 0 turns free shipping off.
  freeShippingThreshold: number;
  announcement: string;
  contactPhone: string;
  contactEmail: string;
  // Private: new-order and low-stock alerts. Falls back to contactEmail, then SMTP_EMAIL.
  notifyEmail: string;
  storeAddress: string;
  socials: { facebook: string; instagram: string; tiktok: string };
  hero: {
    kicker: string;
    highlight: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    imageKey: string;
    imageAlt: string;
    // Empty values are hidden.
    stats: { value: string; label: string }[];
    badgeText: string;
  };
  // Phrases for the scrolling strip under the banner. Empty hides it.
  marquee: string[];
};

export const DEFAULT_SETTINGS: StoreSettings = {
  shippingInsideDhaka: 70,
  shippingOutsideDhaka: 130,
  freeShippingThreshold: 0,
  announcement: "Cash on delivery across Bangladesh",
  contactPhone: "",
  contactEmail: "",
  notifyEmail: "",
  storeAddress: "Dhaka, Bangladesh",
  socials: { facebook: "", instagram: "", tiktok: "" },
  hero: {
    kicker: "New Season",
    highlight: "",
    title: "Quiet Confidence",
    subtitle: "Tailored essentials in warm, timeless tones.",
    ctaLabel: "Shop the collection",
    ctaHref: "/shop",
    secondaryLabel: "Explore Panjabi",
    secondaryHref: "/category/panjabi",
    imageKey: "",
    imageAlt: "QAHAF new season collection",
    stats: [
      { value: "50+", label: "Styles" },
      { value: "64", label: "Districts" },
      { value: "COD", label: "Pay on delivery" },
    ],
    badgeText: "WEAR YOUR STYLE · QAHAF ·",
  },
  marquee: ["New Season", "Panjabi Edit", "Cash on Delivery", "Nationwide Delivery", "Tailored Essentials", "Easy Size Exchange"],
};

export async function getSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const row = await db.query.setting.findFirst({ where: (s, { eq }) => eq(s.key, "store") });
  const saved = (row?.value as Partial<StoreSettings>) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    socials: { ...DEFAULT_SETTINGS.socials, ...saved.socials },
    hero: { ...DEFAULT_SETTINGS.hero, ...saved.hero },
  };
}

export function shippingFeeFor(settings: StoreSettings, district: string, subtotal: number) {
  if (settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold) return 0;
  return district === "Dhaka" ? settings.shippingInsideDhaka : settings.shippingOutsideDhaka;
}
