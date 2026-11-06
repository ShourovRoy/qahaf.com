// Demo catalogue: bun run seed (skips products whose slug already exists).
import "dotenv/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import sharp from "sharp";
import * as schema from "../../src/db/schema";
import { databaseUrl } from "../../src/db/url";
import { categorySvg, heroSvg, type Look, productSvg } from "./art";

const pool = new Pool({ connectionString: databaseUrl() });
const db = drizzle({ client: pool, schema, casing: "snake_case" });
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R3_S3_CLIENT_URL,
  credentials: { accessKeyId: process.env.R3_S3_ACCESS_KEY_ID!, secretAccessKey: process.env.R3_S3_SECRET_ACCESS_KEY! },
});

async function upload(key: string, svg: string) {
  const body = await sharp(Buffer.from(svg)).webp({ quality: 86 }).toBuffer();
  await s3.send(
    new PutObjectCommand({ Bucket: process.env.R3_S3_BUCKET_NAME, Key: key, Body: body, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }),
  );
  return key;
}

const TOPS = ["S", "M", "L", "XL", "XXL"];
const WAIST = ["30", "32", "34", "36", "38"];
const SHOES = ["40", "41", "42", "43", "44"];

const CHARTS = {
  shirt: { unit: "inch" as const, columns: ["Chest", "Length", "Shoulder", "Sleeve"], rows: [["S", "38", "28", "17", "24"], ["M", "40", "29", "17.5", "24.5"], ["L", "42", "30", "18", "25"], ["XL", "44", "31", "18.5", "25.5"], ["XXL", "46", "32", "19", "26"]] },
  panjabi: { unit: "inch" as const, columns: ["Chest", "Length", "Sleeve"], rows: [["S", "40", "40", "23.5"], ["M", "42", "42", "24"], ["L", "44", "43", "24.5"], ["XL", "46", "44", "25"], ["XXL", "48", "45", "25.5"]] },
  tee: { unit: "inch" as const, columns: ["Chest", "Length", "Shoulder"], rows: [["S", "38", "27", "16.5"], ["M", "40", "28", "17"], ["L", "42", "29", "17.5"], ["XL", "44", "30", "18"], ["XXL", "46", "31", "18.5"]] },
  trouser: { unit: "inch" as const, columns: ["Waist", "Hip", "Length", "Inseam"], rows: [["30", "30", "40", "40", "30"], ["32", "32", "42", "40.5", "30.5"], ["34", "34", "44", "41", "31"], ["36", "36", "46", "41.5", "31.5"], ["38", "38", "48", "42", "32"]] },
};
const chart = (c: (typeof CHARTS)[keyof typeof CHARTS]) => ({ unit: c.unit, columns: c.columns, rows: c.rows.map(([size, ...values]) => ({ size, values })) });

const CATEGORIES = [
  { slug: "shirts", name: "Shirts", description: "Oxford, poplin, linen and flannel shirts cut for a clean, modern fit.", look: { kind: "shirt", color: "#EFE8DA" } },
  { slug: "panjabi", name: "Panjabi", description: "Festive and everyday panjabi in breathable cotton and linen, finished with quiet detail.", look: { kind: "panjabi", color: "#5E2329", accent: "#C4A482" } },
  { slug: "polos-tees", name: "Polos & Tees", description: "Soft pique polos and essential crew-neck tees for warm days.", look: { kind: "polo", color: "#23304A" } },
  { slug: "trousers", name: "Trousers", description: "Tailored chinos and wool-blend trousers that move from office to evening.", look: { kind: "trouser", color: "#C8B08C" } },
  { slug: "outerwear", name: "Outerwear", description: "Unstructured blazers and lightweight jackets for cooler evenings.", look: { kind: "blazer", color: "#4A3525" } },
  { slug: "shoes", name: "Shoes", description: "Leather loafers and derbies, made to be worn in.", look: { kind: "loafer", color: "#8A5A3A" } },
  { slug: "accessories", name: "Accessories", description: "Belts, wallets and watches to finish the look.", look: { kind: "watch", color: "#5A3B27" } },
] satisfies { slug: string; name: string; description: string; look: Look }[];

type Seed = {
  slug: string;
  name: string;
  category: string;
  look: Look;
  regular: number;
  sale?: number;
  featured?: boolean;
  sizes: string[];
  stock: number[];
  short: string;
  description: string;
  fabric: string;
  care: string;
  chart?: keyof typeof CHARTS;
};

const PRODUCTS: Seed[] = [
  { slug: "oxford-button-down-shirt-white", name: "Oxford Button-Down Shirt", category: "shirts", look: { kind: "shirt", color: "#F4F1EA" }, regular: 2450, sale: 1990, featured: true, sizes: TOPS, stock: [8, 14, 12, 6, 3], chart: "shirt",
    short: "A crisp, breathable oxford with a soft button-down collar. The shirt you'll reach for every week.",
    description: "Woven from a mid-weight cotton oxford that softens with every wash. Cut slim through the body with a curved hem that works tucked or untucked.\n\n• Button-down collar\n• Single chest pocket\n• Adjustable barrel cuffs", fabric: "100% cotton oxford", care: "Machine wash cold. Hang dry. Warm iron." },
  { slug: "flannel-check-shirt-espresso", name: "Brushed Flannel Check Shirt", category: "shirts", look: { kind: "shirt", color: "#4A3525", pattern: "check", accent: "#1E1916" }, regular: 2650, sale: 2190, featured: true, sizes: TOPS, stock: [5, 9, 7, 4, 2], chart: "shirt",
    short: "Warm, brushed cotton flannel in a deep espresso check. Layer it or wear it alone.",
    description: "A double-brushed flannel with a soft, lived-in hand. Generous through the shoulders for easy layering over a tee.", fabric: "100% brushed cotton flannel", care: "Machine wash cold, inside out. Tumble dry low." },
  { slug: "striped-poplin-shirt-sky", name: "Striped Poplin Shirt", category: "shirts", look: { kind: "shirt", color: "#E9EEF2", pattern: "stripe", accent: "#7F9AB3" }, regular: 2350, sizes: TOPS, stock: [6, 10, 10, 5, 0], chart: "shirt",
    short: "Fine sky-blue stripes on smooth poplin. Sharp enough for the office, easy enough for weekends.",
    description: "Lightweight two-ply poplin with a gentle sheen. Spread collar, mother-of-pearl effect buttons.", fabric: "100% cotton poplin", care: "Machine wash 30°. Iron while slightly damp." },
  { slug: "linen-shirt-sand", name: "Washed Linen Shirt", category: "shirts", look: { kind: "shirt", color: "#D8C4A3" }, regular: 2850, sizes: TOPS, stock: [4, 8, 8, 3, 2], chart: "shirt",
    short: "Garment-washed pure linen in warm sand. Made for Dhaka summers.",
    description: "Pre-washed for a relaxed drape and no stiffness from day one. The natural slub of the linen gives it quiet texture.", fabric: "100% linen", care: "Machine wash cold. Line dry. Wrinkles are part of the charm." },
  { slug: "camp-shirt-olive", name: "Everyday Shirt", category: "shirts", look: { kind: "shirt", color: "#5B5E3C" }, regular: 2250, sale: 1790, sizes: TOPS, stock: [3, 6, 5, 2, 1], chart: "shirt",
    short: "A muted olive cotton shirt with a relaxed, easy fit.",
    description: "Soft twill cotton in an earthy olive that pairs with sand chinos or dark denim.", fabric: "100% cotton twill", care: "Machine wash cold. Tumble dry low." },

  { slug: "cotton-panjabi-ivory", name: "Classic Cotton Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#EFE8DA", accent: "#B89775" }, regular: 3450, featured: true, sizes: TOPS, stock: [10, 15, 12, 8, 4], chart: "panjabi",
    short: "A clean ivory panjabi in fine cotton with tonal tan embroidery along the placket.",
    description: "Our signature everyday panjabi. Mandarin collar, concealed side pockets and side slits for easy movement. Embroidered by hand along the placket.", fabric: "100% fine cotton", care: "Gentle machine wash cold. Dry in shade. Iron on reverse." },
  { slug: "embroidered-panjabi-burgundy", name: "Embroidered Festive Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#5E2329", accent: "#C4A482" }, regular: 4950, sale: 3990, featured: true, sizes: TOPS, stock: [4, 7, 6, 3, 1], chart: "panjabi",
    short: "Deep burgundy with golden-tan embroidery. Made for Eid, weddings and evenings that matter.",
    description: "A richer cotton-silk blend with a subtle sheen. Embroidered placket and cuffs, wooden buttons.", fabric: "Cotton-silk blend", care: "Dry clean recommended." },
  { slug: "classic-panjabi-navy", name: "Midnight Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#23304A", accent: "#C4A482" }, regular: 3250, sizes: TOPS, stock: [6, 9, 9, 5, 2], chart: "panjabi",
    short: "A deep navy panjabi with a quietly confident finish.",
    description: "Mid-weight cotton with a mandarin collar and tan-thread detailing.", fabric: "100% cotton", care: "Machine wash cold, inside out. Dry in shade." },
  { slug: "linen-panjabi-sand", name: "Linen Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#D8C4A3", accent: "#4A3525" }, regular: 3650, sizes: TOPS, stock: [5, 8, 6, 2, 0], chart: "panjabi",
    short: "Airy linen panjabi in natural sand, finished with espresso detailing.",
    description: "Lightweight and breathable linen for long summer days and Friday prayers.", fabric: "100% linen", care: "Hand wash cold. Line dry." },

  { slug: "pique-polo-navy", name: "Pique Polo", category: "polos-tees", look: { kind: "polo", color: "#23304A" }, regular: 1450, featured: true, sizes: TOPS, stock: [12, 20, 18, 10, 6], chart: "tee",
    short: "A structured cotton pique polo in deep navy. Holds its shape, wash after wash.",
    description: "Two-button placket, ribbed collar and cuffs, and a longer back hem.", fabric: "100% combed cotton pique", care: "Machine wash cold. Do not tumble dry." },
  { slug: "pique-polo-burgundy", name: "Pique Polo — Burgundy", category: "polos-tees", look: { kind: "polo", color: "#5E2329" }, regular: 1450, sale: 1190, sizes: TOPS, stock: [6, 10, 8, 4, 2], chart: "tee",
    short: "Our pique polo in a rich burgundy.",
    description: "Two-button placket, ribbed collar and cuffs, and a longer back hem.", fabric: "100% combed cotton pique", care: "Machine wash cold. Do not tumble dry." },
  { slug: "essential-crew-tee-black", name: "Essential Crew Tee", category: "polos-tees", look: { kind: "tee", color: "#232020" }, regular: 890, sizes: TOPS, stock: [20, 30, 30, 15, 8], chart: "tee",
    short: "A heavyweight black tee that won't go see-through or lose its collar.",
    description: "220 GSM cotton jersey, pre-shrunk, with a reinforced crew neck.", fabric: "100% cotton jersey, 220 GSM", care: "Machine wash cold, inside out." },
  { slug: "essential-crew-tee-grey", name: "Essential Crew Tee — Grey Melange", category: "polos-tees", look: { kind: "tee", color: "#9C9A96", pattern: "melange" }, regular: 890, sizes: TOPS, stock: [14, 22, 20, 9, 4], chart: "tee",
    short: "The essential tee in soft grey melange.",
    description: "220 GSM cotton jersey, pre-shrunk, with a reinforced crew neck.", fabric: "95% cotton, 5% viscose", care: "Machine wash cold, inside out." },

  { slug: "tailored-chino-sand", name: "Tailored Chino", category: "trousers", look: { kind: "trouser", color: "#C8B08C" }, regular: 2450, featured: true, sizes: WAIST, stock: [6, 12, 12, 7, 3], chart: "trouser",
    short: "A slim, tapered chino in warm sand with a touch of stretch.",
    description: "Cut slim through the thigh with a gentle taper. Flat front, slanted pockets and a clean hem.", fabric: "98% cotton, 2% elastane twill", care: "Machine wash cold. Hang dry." },
  { slug: "tailored-chino-olive", name: "Tailored Chino — Olive", category: "trousers", look: { kind: "trouser", color: "#5B5E3C" }, regular: 2450, sizes: WAIST, stock: [4, 8, 9, 4, 2], chart: "trouser",
    short: "Our tailored chino in earthy olive.",
    description: "Cut slim through the thigh with a gentle taper. Flat front, slanted pockets and a clean hem.", fabric: "98% cotton, 2% elastane twill", care: "Machine wash cold. Hang dry." },
  { slug: "wool-blend-trouser-charcoal", name: "Wool-Blend Trouser", category: "trousers", look: { kind: "trouser", color: "#3A3836" }, regular: 3250, sale: 2790, sizes: WAIST, stock: [3, 5, 6, 3, 1], chart: "trouser",
    short: "Charcoal trousers with a fine wool feel and a sharp pressed crease.",
    description: "A polyester-wool blend that resists creasing while keeping a soft drape.", fabric: "70% polyester, 30% wool", care: "Dry clean or gentle wash cold." },

  { slug: "unstructured-blazer-espresso", name: "Unstructured Blazer", category: "outerwear", look: { kind: "blazer", color: "#4A3525" }, regular: 7950, featured: true, sizes: TOPS, stock: [2, 5, 5, 3, 1], chart: "shirt",
    short: "A soft-shouldered espresso blazer that wears like a cardigan and looks like tailoring.",
    description: "Half-lined with no shoulder padding for a natural line. Notch lapel, patch pockets and two-button front.", fabric: "Cotton-linen blend", care: "Dry clean only." },
  { slug: "harrington-jacket-navy", name: "Harrington Jacket", category: "outerwear", look: { kind: "jacket", color: "#2B3A55" }, regular: 4950, sale: 4250, sizes: TOPS, stock: [3, 6, 6, 2, 0],
    short: "A classic zip-front jacket in navy with ribbed cuffs and hem.",
    description: "Water-resistant cotton shell with a check lining. Stand collar and two-way zip.", fabric: "Cotton shell, cotton check lining", care: "Machine wash cold. Line dry." },

  { slug: "penny-loafer-tan", name: "Leather Penny Loafer", category: "shoes", look: { kind: "loafer", color: "#8A5A3A" }, regular: 4450, featured: true, sizes: SHOES, stock: [3, 6, 7, 5, 2],
    short: "Hand-finished tan leather loafers with a cushioned insole.",
    description: "Full-grain leather upper, leather lining and a durable rubber sole. Breaks in beautifully.", fabric: "Full-grain leather upper, rubber sole", care: "Wipe clean. Condition leather monthly." },
  { slug: "derby-shoe-black", name: "Classic Derby", category: "shoes", look: { kind: "derby", color: "#2A2422" }, regular: 4950, sizes: SHOES, stock: [2, 4, 5, 3, 1],
    short: "Polished black derby shoes for formal days and long evenings.",
    description: "Open lacing for a comfortable fit across the instep. Leather upper with a stitched rubber sole.", fabric: "Polished leather upper, rubber sole", care: "Polish regularly. Use shoe trees." },

  { slug: "leather-belt-brown", name: "Leather Belt", category: "accessories", look: { kind: "belt", color: "#5A3B27" }, regular: 1250, sizes: ["32", "34", "36", "38"], stock: [6, 10, 8, 4],
    short: "A full-grain brown leather belt with a brushed brass buckle.",
    description: "35mm width, works with chinos and tailoring alike.", fabric: "Full-grain leather, brass buckle", care: "Condition occasionally." },
  { slug: "classic-watch-brown", name: "Classic Field Watch", category: "accessories", look: { kind: "watch", color: "#5A3B27" }, regular: 3950, sale: 3450, featured: true, sizes: ["Free Size"], stock: [7],
    short: "A clean ivory dial on a brown leather strap. Simple, readable, timeless.",
    description: "38mm stainless steel case, quartz movement and water resistance for everyday wear.", fabric: "Stainless steel case, leather strap", care: "Avoid prolonged water exposure." },
  { slug: "bifold-wallet-tan", name: "Bifold Wallet", category: "accessories", look: { kind: "wallet", color: "#A87650" }, regular: 1150, sizes: ["Free Size"], stock: [2],
    short: "A slim tan leather bifold with six card slots.",
    description: "Hand-stitched edges and a debossed QAHAF mark.", fabric: "Vegetable-tanned leather", care: "Keep dry. Condition occasionally." },

  // Second batch
  { slug: "denim-shirt-indigo", name: "Chambray Denim Shirt", category: "shirts", look: { kind: "shirt", color: "#3E5577", pattern: "melange" }, regular: 2550, sizes: TOPS, stock: [5, 9, 9, 4, 2], chart: "shirt",
    short: "Soft indigo chambray that fades beautifully over time.",
    description: "Lightweight chambray with snap-free chest pockets and a relaxed fit.", fabric: "100% cotton chambray", care: "Machine wash cold, inside out." },
  { slug: "oxford-shirt-blue", name: "Oxford Button-Down — Blue", category: "shirts", look: { kind: "shirt", color: "#A9BCD3" }, regular: 2450, sizes: TOPS, stock: [7, 12, 11, 6, 3], chart: "shirt",
    short: "Our oxford button-down in classic pale blue.",
    description: "Mid-weight oxford, button-down collar and a curved hem.", fabric: "100% cotton oxford", care: "Machine wash cold. Hang dry. Warm iron." },
  { slug: "check-shirt-burgundy", name: "Gingham Check Shirt", category: "shirts", look: { kind: "shirt", color: "#EFE8DA", pattern: "check", accent: "#7A2E35" }, regular: 2350, sale: 1890, sizes: TOPS, stock: [4, 7, 6, 3, 1], chart: "shirt",
    short: "A small burgundy gingham that brings warmth to any outfit.",
    description: "Yarn-dyed cotton with a semi-spread collar.", fabric: "100% yarn-dyed cotton", care: "Machine wash 30°." },
  { slug: "linen-shirt-white", name: "Washed Linen Shirt — White", category: "shirts", look: { kind: "shirt", color: "#F6F3EC" }, regular: 2850, featured: true, sizes: TOPS, stock: [6, 10, 9, 4, 2], chart: "shirt",
    short: "Bright white linen, pre-washed for softness.",
    description: "Relaxed fit with a single chest pocket. The coolest shirt you'll own.", fabric: "100% linen", care: "Machine wash cold. Line dry." },
  { slug: "pinstripe-shirt-charcoal", name: "Pinstripe Dress Shirt", category: "shirts", look: { kind: "shirt", color: "#3A3836", pattern: "stripe", accent: "#9C9A96" }, regular: 2650, sizes: TOPS, stock: [3, 6, 6, 3, 1], chart: "shirt",
    short: "Charcoal with a fine grey pinstripe for evenings out.",
    description: "Smooth twill with a cutaway collar and double-button cuffs.", fabric: "100% cotton twill", care: "Machine wash 30°. Iron on reverse." },

  { slug: "panjabi-olive-festive", name: "Olive Festive Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#5B5E3C", accent: "#C4A482" }, regular: 4250, sale: 3590, featured: true, sizes: TOPS, stock: [5, 8, 7, 3, 1], chart: "panjabi",
    short: "Deep olive cotton-silk with tan embroidery at the collar and placket.",
    description: "A festive panjabi with a soft sheen, wooden buttons and side pockets.", fabric: "Cotton-silk blend", care: "Dry clean recommended." },
  { slug: "panjabi-black-classic", name: "Black Classic Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#232020", accent: "#B89775" }, regular: 3450, sizes: TOPS, stock: [8, 12, 10, 6, 3], chart: "panjabi",
    short: "Timeless black with a tonal tan placket.",
    description: "Fine cotton, mandarin collar and side slits.", fabric: "100% fine cotton", care: "Machine wash cold, inside out." },
  { slug: "panjabi-sky-cotton", name: "Sky Cotton Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#A9BCD3", accent: "#23304A" }, regular: 2950, sale: 2490, sizes: TOPS, stock: [6, 9, 8, 4, 2], chart: "panjabi",
    short: "A light sky-blue panjabi for summer Fridays.",
    description: "Breathable cotton voile with navy thread detailing.", fabric: "100% cotton voile", care: "Gentle wash cold. Dry in shade." },
  { slug: "panjabi-mustard-wedding", name: "Mustard Wedding Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#B8862E", accent: "#4A3525" }, regular: 5450, featured: true, sizes: TOPS, stock: [3, 5, 5, 2, 1], chart: "panjabi",
    short: "Haldi-ready mustard with rich chocolate embroidery.",
    description: "Cotton-silk with a full embroidered placket and cuffs.", fabric: "Cotton-silk blend", care: "Dry clean only." },
  { slug: "panjabi-stripe-ivory", name: "Pinstripe Panjabi", category: "panjabi", look: { kind: "panjabi", color: "#EFE8DA", pattern: "stripe", accent: "#C4A482" }, regular: 3150, sizes: TOPS, stock: [5, 8, 8, 4, 0], chart: "panjabi",
    short: "Ivory panjabi with a fine tan stripe.",
    description: "Everyday cotton with a modern straight hem.", fabric: "100% cotton", care: "Machine wash cold." },

  { slug: "pique-polo-white", name: "Pique Polo — White", category: "polos-tees", look: { kind: "polo", color: "#F4F1EA" }, regular: 1450, sizes: TOPS, stock: [10, 16, 15, 8, 4], chart: "tee",
    short: "The pique polo in crisp white.",
    description: "Two-button placket, ribbed collar and cuffs.", fabric: "100% combed cotton pique", care: "Machine wash cold." },
  { slug: "pique-polo-sand", name: "Pique Polo — Sand", category: "polos-tees", look: { kind: "polo", color: "#C8B08C" }, regular: 1450, sale: 1150, featured: true, sizes: TOPS, stock: [8, 12, 12, 6, 2], chart: "tee",
    short: "Warm sand pique, an easy match for navy chinos.",
    description: "Two-button placket, ribbed collar and cuffs.", fabric: "100% combed cotton pique", care: "Machine wash cold." },
  { slug: "essential-crew-tee-white", name: "Essential Crew Tee — White", category: "polos-tees", look: { kind: "tee", color: "#F6F3EC" }, regular: 890, sizes: TOPS, stock: [25, 35, 30, 15, 8], chart: "tee",
    short: "The heavyweight essential tee in white.",
    description: "220 GSM cotton jersey with a reinforced crew neck.", fabric: "100% cotton jersey, 220 GSM", care: "Machine wash cold, inside out." },
  { slug: "striped-tee-navy", name: "Breton Stripe Tee", category: "polos-tees", look: { kind: "tee", color: "#EFE8DA", pattern: "stripe", accent: "#23304A" }, regular: 1190, sale: 950, sizes: TOPS, stock: [6, 10, 9, 4, 2], chart: "tee",
    short: "A navy-striped tee with a relaxed nautical feel.",
    description: "Mid-weight cotton jersey with dropped shoulders.", fabric: "100% cotton jersey", care: "Machine wash cold." },
  { slug: "essential-crew-tee-olive", name: "Essential Crew Tee — Olive", category: "polos-tees", look: { kind: "tee", color: "#5B5E3C" }, regular: 890, sizes: TOPS, stock: [12, 18, 16, 8, 3], chart: "tee",
    short: "The essential tee in earthy olive.",
    description: "220 GSM cotton jersey with a reinforced crew neck.", fabric: "100% cotton jersey, 220 GSM", care: "Machine wash cold, inside out." },

  { slug: "tailored-chino-navy", name: "Tailored Chino — Navy", category: "trousers", look: { kind: "trouser", color: "#23304A" }, regular: 2450, sale: 1990, sizes: WAIST, stock: [5, 10, 10, 5, 2], chart: "trouser",
    short: "Our tailored chino in versatile navy.",
    description: "Slim through the thigh with a gentle taper and a touch of stretch.", fabric: "98% cotton, 2% elastane twill", care: "Machine wash cold. Hang dry." },
  { slug: "linen-trouser-ivory", name: "Linen Drawstring Trouser", category: "trousers", look: { kind: "trouser", color: "#EFE8DA" }, regular: 2650, featured: true, sizes: WAIST, stock: [4, 8, 8, 4, 1], chart: "trouser",
    short: "Relaxed ivory linen with a hidden drawstring waist.",
    description: "Pair with a panjabi or a linen shirt for easy summer dressing.", fabric: "100% linen", care: "Machine wash cold. Line dry." },
  { slug: "pleated-trouser-chocolate", name: "Pleated Trouser", category: "trousers", look: { kind: "trouser", color: "#4A3525" }, regular: 3450, sizes: WAIST, stock: [3, 6, 6, 3, 1], chart: "trouser",
    short: "A single-pleat chocolate trouser with a generous, modern leg.",
    description: "Wool-feel twill with side adjusters and a pressed crease.", fabric: "65% polyester, 35% viscose", care: "Dry clean or gentle wash cold." },

  { slug: "linen-blazer-sand", name: "Linen Blazer", category: "outerwear", look: { kind: "blazer", color: "#C8B08C" }, regular: 7450, sale: 6450, featured: true, sizes: TOPS, stock: [2, 4, 4, 2, 1], chart: "shirt",
    short: "A breathable sand linen blazer for summer weddings.",
    description: "Unlined, unstructured and light. Patch pockets and a two-button front.", fabric: "100% linen", care: "Dry clean only." },
  { slug: "unstructured-blazer-navy", name: "Unstructured Blazer — Navy", category: "outerwear", look: { kind: "blazer", color: "#23304A" }, regular: 7950, sizes: TOPS, stock: [2, 4, 5, 2, 0], chart: "shirt",
    short: "The soft-shouldered blazer in deep navy.",
    description: "Half-lined with no shoulder padding. Notch lapel and patch pockets.", fabric: "Cotton-linen blend", care: "Dry clean only." },
  { slug: "overshirt-jacket-olive", name: "Utility Overshirt", category: "outerwear", look: { kind: "jacket", color: "#5B5E3C" }, regular: 3950, sizes: TOPS, stock: [4, 7, 6, 3, 1],
    short: "A sturdy olive overshirt for cooler winter evenings.",
    description: "Heavy cotton canvas with two chest pockets and a zip front.", fabric: "100% cotton canvas", care: "Machine wash cold." },

  { slug: "penny-loafer-chocolate", name: "Leather Penny Loafer — Chocolate", category: "shoes", look: { kind: "loafer", color: "#4A3525" }, regular: 4450, sale: 3790, sizes: SHOES, stock: [2, 5, 6, 4, 1],
    short: "Our penny loafer in rich chocolate leather.",
    description: "Full-grain leather upper and lining with a rubber sole.", fabric: "Full-grain leather upper, rubber sole", care: "Wipe clean. Condition monthly." },
  { slug: "suede-loafer-sand", name: "Suede Loafer", category: "shoes", look: { kind: "loafer", color: "#C8B08C" }, regular: 4650, featured: true, sizes: SHOES, stock: [3, 5, 5, 3, 1],
    short: "Soft sand suede loafers for warm weekends.",
    description: "Unlined suede upper with a flexible sole. No socks needed.", fabric: "Suede upper, rubber sole", care: "Brush with a suede brush. Keep dry." },
  { slug: "derby-shoe-brown", name: "Classic Derby — Brown", category: "shoes", look: { kind: "derby", color: "#6A4630" }, regular: 4950, sizes: SHOES, stock: [2, 4, 4, 2, 1],
    short: "Our derby in burnished brown.",
    description: "Open lacing and a stitched rubber sole.", fabric: "Polished leather upper, rubber sole", care: "Polish regularly." },

  { slug: "leather-belt-black", name: "Leather Belt — Black", category: "accessories", look: { kind: "belt", color: "#232020" }, regular: 1250, sale: 990, sizes: ["32", "34", "36", "38"], stock: [5, 9, 8, 3],
    short: "A full-grain black leather belt with a brushed silver buckle.",
    description: "35mm width for chinos and tailoring.", fabric: "Full-grain leather", care: "Condition occasionally." },
  { slug: "classic-watch-black", name: "Classic Field Watch — Black", category: "accessories", look: { kind: "watch", color: "#232020" }, regular: 3950, sizes: ["Free Size"], stock: [5],
    short: "The field watch on a black leather strap.",
    description: "38mm stainless steel case and quartz movement.", fabric: "Stainless steel case, leather strap", care: "Avoid prolonged water exposure." },
  { slug: "card-wallet-chocolate", name: "Card Holder", category: "accessories", look: { kind: "wallet", color: "#4A3525" }, regular: 850, featured: true, sizes: ["Free Size"], stock: [12],
    short: "A slim chocolate leather card holder for front-pocket carry.",
    description: "Four card slots and a centre pocket for notes.", fabric: "Vegetable-tanned leather", care: "Keep dry." },
];

const CAT_BG = ["#F3EFE7", "#EDE5D8", "#E8EBEE", "#F1EADF", "#E9E1D6", "#EFE6DA", "#ECE7DF"];

async function main() {
  console.log("Categories…");
  const catIds: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const existing = await db.query.category.findFirst({ where: eq(schema.category.slug, c.slug) });
    if (existing) {
      catIds[c.slug] = existing.id;
      continue;
    }
    const imageKey = await upload(`categories/seed-${c.slug}.webp`, categorySvg(c.look, CAT_BG[i]));
    const [row] = await db
      .insert(schema.category)
      .values({ name: c.name, slug: c.slug, description: c.description, imageKey, sortOrder: i, seoDescription: c.description })
      .returning({ id: schema.category.id });
    catIds[c.slug] = row.id;
  }

  console.log("Products…");
  for (const [i, p] of PRODUCTS.entries()) {
    if (await db.query.product.findFirst({ where: eq(schema.product.slug, p.slug), columns: { id: true } })) {
      console.log(`  skip ${p.slug}`);
      continue;
    }
    const keys = await Promise.all([
      upload(`products/seed/${p.slug}-1.webp`, productSvg(p.look, 1)),
      upload(`products/seed/${p.slug}-2.webp`, productSvg(p.look, 2)),
    ]);
    // Interleave both batches so New Arrivals mixes them.
    const daysAgo = ((i * 7) % 50) + 1;
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.product)
        .values({
          name: p.name,
          slug: p.slug,
          categoryId: catIds[p.category],
          shortDescription: p.short,
          description: p.description,
          regularPrice: p.regular,
          salePrice: p.sale ?? null,
          fabric: p.fabric,
          careInstructions: p.care,
          sizeChart: p.chart ? chart(CHARTS[p.chart]) : null,
          status: "active",
          isFeatured: !!p.featured,
          lowStockThreshold: 3,
          createdAt: sql`now() - make_interval(days => ${daysAgo})`,
        })
        .returning({ id: schema.product.id });
      const skuBase = p.slug.split("-").map((w) => w[0]).join("").toUpperCase();
      await tx.insert(schema.productVariant).values(
        p.sizes.map((size, j) => ({ productId: row.id, size, sku: `QH-${skuBase}${i}-${size.replace(/\s/g, "").toUpperCase()}`, stock: p.stock[j] ?? 0, sortOrder: j })),
      );
      await tx.insert(schema.productMedia).values(keys.map((key, j) => ({ productId: row.id, type: "image" as const, key, alt: j === 0 ? p.name : `${p.name} detail`, sortOrder: j })));
    });
    console.log(`  + ${p.name}`);
  }

  const hasSettings = await db.query.setting.findFirst({ where: eq(schema.setting.key, "store") });
  if (!hasSettings) {
    console.log("Homepage banner…");
    const imageKey = await upload(
      "site/seed-hero.webp",
      heroSvg([
        { kind: "blazer", color: "#3D2B1F" },
        { kind: "shirt", color: "#EFE8DA" },
        { kind: "shirt", color: "#8A5A3A" },
        { kind: "panjabi", color: "#E4D7C3", accent: "#B89775" },
      ]),
    );
    await db.insert(schema.setting).values({
      key: "store",
      value: {
        shippingInsideDhaka: 70,
        shippingOutsideDhaka: 130,
        freeShippingThreshold: 5000,
        announcement: "Free delivery on orders over ৳5,000 · Cash on delivery nationwide",
        contactPhone: "",
        contactEmail: "",
        notifyEmail: "",
        storeAddress: "Dhaka, Bangladesh",
        socials: { facebook: "", instagram: "", tiktok: "" },
        hero: {
          kicker: "The New Season",
          highlight: "",
          title: "Quiet confidence, tailored.",
          subtitle: "Shirts, panjabi and tailoring in warm, timeless tones, made for everyday Bangladesh.",
          ctaLabel: "Shop new arrivals",
          ctaHref: "/shop?sort=newest",
          secondaryLabel: "Explore Panjabi",
          secondaryHref: "/category/panjabi",
          imageKey,
          imageAlt: "Shirts, panjabi and a blazer on a clothes rail",
          stats: [
            { value: "50+", label: "Styles" },
            { value: "64", label: "Districts" },
            { value: "COD", label: "Pay on delivery" },
          ],
          badgeText: "WEAR YOUR STYLE · QAHAF ·",
        },
        marquee: ["New Season", "Panjabi Edit", "Cash on Delivery", "Nationwide Delivery", "Tailored Essentials", "Easy Size Exchange"],
      },
    });
  }

  console.log("Done.");
}

await main();
await pool.end();
