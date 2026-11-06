import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// All money columns are whole BDT (taka).

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

/* ---------- Auth ---------- */

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  // scrypt "salt:key", see src/lib/auth.ts.
  passwordHash: text(),
  image: text(),
  role: text({ enum: ["customer", "admin"] }).default("customer").notNull(),
  // Normalized to +8801XXXXXXXXX.
  phone: text().unique(),
  isBlocked: boolean().default(false).notNull(),
  ...timestamps,
});

// token holds a SHA-256 of the cookie value, never the value itself.
export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

// One-time email links. identifier is "<purpose>:<userId>[:<extra>]", value is the token's SHA-256.
export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier), index().on(t.value)],
);

/* ---------- Customer ---------- */

export const address = pgTable(
  "address",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text().default("Home").notNull(),
    fullName: text().notNull(),
    phone: text().notNull(),
    division: text().notNull(),
    district: text().notNull(),
    area: text().notNull(),
    addressLine: text().notNull(),
    postcode: text().notNull(),
    isDefault: boolean().default(false).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

/* ---------- Catalog ---------- */

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const mediaType = pgEnum("media_type", ["image", "video"]);

export const category = pgTable(
  "category",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    description: text(),
    imageKey: text(),
    parentId: uuid().references((): AnyPgColumn => category.id, { onDelete: "set null" }),
    sortOrder: integer().default(0).notNull(),
    isActive: boolean().default(true).notNull(),
    seoTitle: text(),
    seoDescription: text(),
    ...timestamps,
  },
  (t) => [index().on(t.parentId)],
);

export type SizeChart = {
  unit: "inch" | "cm";
  columns: string[];
  rows: { size: string; values: string[] }[];
};

export const product = pgTable(
  "product",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    categoryId: uuid().references(() => category.id, { onDelete: "set null" }),
    shortDescription: text().notNull(),
    description: text(),
    regularPrice: integer().notNull(),
    // Null means not on sale. Discount = regularPrice - salePrice.
    salePrice: integer(),
    sizeChart: jsonb().$type<SizeChart>(),
    fabric: text(),
    careInstructions: text(),
    status: productStatus().default("draft").notNull(),
    isFeatured: boolean().default(false).notNull(),
    lowStockThreshold: integer().default(5).notNull(),
    // Denormalized so listings don't aggregate reviews on every read.
    ratingSum: integer().default(0).notNull(),
    ratingCount: integer().default(0).notNull(),
    seoTitle: text(),
    seoDescription: text(),
    ...timestamps,
  },
  (t) => [
    index().on(t.categoryId),
    index().on(t.status),
    check("sale_below_regular", sql`${t.salePrice} IS NULL OR ${t.salePrice} < ${t.regularPrice}`),
  ],
);

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    size: text().notNull(),
    color: text(),
    sku: text().notNull().unique(),
    stock: integer().default(0).notNull(),
    sortOrder: integer().default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    index().on(t.productId),
    unique().on(t.productId, t.size, t.color).nullsNotDistinct(),
    check("stock_non_negative", sql`${t.stock} >= 0`),
  ],
);

export const productMedia = pgTable(
  "product_media",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    type: mediaType().notNull(),
    key: text().notNull(),
    alt: text(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.productId)],
);

/* ---------- Cart & wishlist ---------- */

// Guests get a cart keyed by cookie; it is merged into the user's cart on login.
export const cart = pgTable("cart", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    cartId: uuid()
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.cartId, t.variantId), check("qty_positive", sql`${t.quantity} > 0`)],
);

export const wishlistItem = pgTable(
  "wishlist_item",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

/* ---------- Orders & payments ---------- */

export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "rejected",
]);

// New gateways only need a new enum value; order and payment shapes stay the same.
export const paymentProvider = pgEnum("payment_provider", ["cod", "sslcommerz", "paystation"]);

export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const transactionType = pgEnum("transaction_type", ["charge", "refund"]);
export const transactionStatus = pgEnum("transaction_status", [
  "pending",
  "succeeded",
  "failed",
  "cancelled",
]);

export const order = pgTable(
  "order",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderNumber: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus().default("pending").notNull(),
    paymentMethod: paymentProvider().notNull(),
    paymentStatus: paymentStatus().default("unpaid").notNull(),
    subtotal: integer().notNull(),
    discountTotal: integer().default(0).notNull(),
    shippingFee: integer().notNull(),
    total: integer().notNull(),
    currency: text().default("BDT").notNull(),
    // Address is copied so later profile edits don't change past orders.
    shippingName: text().notNull(),
    shippingPhone: text().notNull(),
    shippingDivision: text().notNull(),
    shippingDistrict: text().notNull(),
    shippingArea: text().notNull(),
    shippingAddressLine: text().notNull(),
    shippingPostcode: text().notNull(),
    customerNote: text(),
    adminNote: text(),
    statusReason: text(),
    confirmedAt: timestamp({ withTimezone: true }),
    shippedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.userId), index().on(t.status), index().on(t.createdAt)],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: uuid().references(() => product.id, { onDelete: "set null" }),
    variantId: uuid().references(() => productVariant.id, { onDelete: "set null" }),
    // Snapshot of the product at purchase time.
    productName: text().notNull(),
    productSlug: text().notNull(),
    size: text().notNull(),
    color: text(),
    sku: text().notNull(),
    imageKey: text(),
    unitPrice: integer().notNull(),
    regularPrice: integer().notNull(),
    quantity: integer().notNull(),
    lineTotal: integer().notNull(),
  },
  (t) => [index().on(t.orderId), index().on(t.productId)],
);

export const orderEvent = pgTable(
  "order_event",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    fromStatus: orderStatus(),
    toStatus: orderStatus().notNull(),
    note: text(),
    actorId: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.orderId)],
);

// One row per money movement. COD orders get a pending charge that succeeds on delivery.
export const transaction = pgTable(
  "transaction",
  {
    id: uuid().primaryKey().defaultRandom(),
    reference: text().notNull().unique(),
    orderId: uuid()
      .notNull()
      .references(() => order.id, { onDelete: "restrict" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    provider: paymentProvider().notNull(),
    type: transactionType().default("charge").notNull(),
    status: transactionStatus().default("pending").notNull(),
    amount: integer().notNull(),
    currency: text().default("BDT").notNull(),
    // Gateway ids (e.g. SSLCommerz tran_id / val_id), null for COD.
    providerTransactionId: text(),
    providerSessionId: text(),
    providerPayload: jsonb(),
    failureReason: text(),
    completedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index().on(t.orderId),
    index().on(t.status),
    index().on(t.createdAt),
    uniqueIndex().on(t.provider, t.providerTransactionId),
  ],
);

/* ---------- Reviews ---------- */

export const review = pgTable(
  "review",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderItemId: uuid()
      .notNull()
      .unique()
      .references(() => orderItem.id, { onDelete: "cascade" }),
    rating: smallint().notNull(),
    body: text().notNull(),
    isHidden: boolean().default(false).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.productId), check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`)],
);

export const reviewMedia = pgTable(
  "review_media",
  {
    id: uuid().primaryKey().defaultRandom(),
    reviewId: uuid()
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    type: mediaType().notNull(),
    key: text().notNull(),
    sortOrder: integer().default(0).notNull(),
  },
  (t) => [index().on(t.reviewId)],
);

/* ---------- Store settings ---------- */

export const setting = pgTable("setting", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/* ---------- Relations ---------- */

export const userRelations = relations(user, ({ many, one }) => ({
  addresses: many(address),
  orders: many(order),
  reviews: many(review),
  cart: one(cart),
}));

export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, { fields: [address.userId], references: [user.id] }),
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
  parent: one(category, { fields: [category.parentId], references: [category.id], relationName: "tree" }),
  children: many(category, { relationName: "tree" }),
  products: many(product),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, { fields: [product.categoryId], references: [category.id] }),
  variants: many(productVariant),
  media: many(productMedia),
  reviews: many(review),
}));

export const productVariantRelations = relations(productVariant, ({ one }) => ({
  product: one(product, { fields: [productVariant.productId], references: [product.id] }),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(product, { fields: [productMedia.productId], references: [product.id] }),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(user, { fields: [cart.userId], references: [user.id] }),
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, { fields: [cartItem.cartId], references: [cart.id] }),
  variant: one(productVariant, { fields: [cartItem.variantId], references: [productVariant.id] }),
}));

export const wishlistItemRelations = relations(wishlistItem, ({ one }) => ({
  product: one(product, { fields: [wishlistItem.productId], references: [product.id] }),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
  items: many(orderItem),
  events: many(orderEvent),
  transactions: many(transaction),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  product: one(product, { fields: [orderItem.productId], references: [product.id] }),
  review: one(review),
}));

export const orderEventRelations = relations(orderEvent, ({ one }) => ({
  order: one(order, { fields: [orderEvent.orderId], references: [order.id] }),
  actor: one(user, { fields: [orderEvent.actorId], references: [user.id] }),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  order: one(order, { fields: [transaction.orderId], references: [order.id] }),
  user: one(user, { fields: [transaction.userId], references: [user.id] }),
}));

export const reviewRelations = relations(review, ({ one, many }) => ({
  product: one(product, { fields: [review.productId], references: [product.id] }),
  user: one(user, { fields: [review.userId], references: [user.id] }),
  orderItem: one(orderItem, { fields: [review.orderItemId], references: [orderItem.id] }),
  media: many(reviewMedia),
}));

export const reviewMediaRelations = relations(reviewMedia, ({ one }) => ({
  review: one(review, { fields: [reviewMedia.reviewId], references: [review.id] }),
}));
