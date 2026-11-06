# QAHAF

Online menswear store for Bangladesh, built with Next.js, PostgreSQL and Cloudflare R2. Customers pay by cash on delivery or by bKash (manual Send Money, checked by an admin).

## Features

- **Storefront:**
  - Categories, search, filters (size, price, sale), sorting and pagination.
  - Product pages with an image and video gallery, size chart, related products and rich SEO data.
  - Mobile menu drawer and a drop-down search bar on small screens.
- **Payments:**
  - Cash on delivery.
  - bKash: the customer sends money to the store's bKash number and enters the TrxID at checkout. An admin verifies it before confirming the order.
- **Customers:**
  - Sign-up with email verification, unique email and Bangladeshi phone number, password reset, and email change.
  - Profile, address book, wishlist, order history with live status, and transactions.
  - A corrected bKash TrxID can be sent from the order page if a payment wasn't found.
  - Guests can browse and add to the cart; checkout requires an account.
- **Reviews:**
  - Star rating, text, photos and short videos, after an order is delivered or cancelled.
  - Review details are visible to signed-in users only.
- **Admin panel:**
  - Dashboard and order verification (confirm, reject, ship, deliver).
  - bKash payment checks on each order (received, not received, refund).
  - Transaction board.
  - Products: regular price, sale price and discount, sizes and stock, measurements, media, and SEO.
  - Categories, inventory with low-stock alerts, customers (block or unblock), review moderation, and store settings (delivery fees, bKash number, homepage banner, contact details, order alert email).

## Getting started

1. Install dependencies:
   ```bash
   bun install
   ```
2. Copy `.example.env` to `.env` and fill in every value.
3. Start a database. Optionally, run Postgres locally with `docker compose up -d`.
4. Apply the migrations:
   ```bash
   bun run db:migrate
   ```
5. Start the dev server:
   ```bash
   bun dev
   ```
   Then open http://localhost:3000.
6. Register an account, verify the email, and make it an admin:
   ```bash
   bun run make-admin you@example.com
   ```
   Sign in again, then open `/admin`.
7. In **Admin → Settings**, set the delivery fees, contact details and **Order alert email** (where new-order and low-stock emails go). Turn on bKash there if you accept it.

### Environment variables

All names are in `.example.env`.

| Variable | Purpose |
| --- | --- |
| `POSTGRESQL_URL` | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | Public site address, used in emails, sitemap and SEO tags |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD` | Outgoing mail (verification, password reset, order updates). For Gmail use an app password. |
| `R3_S3_*` | Cloudflare R2 bucket and credentials for product, banner and review media. `R3_S3_domain` is the public media address. |

Store settings such as the bKash number and the order alert email are set in the admin panel, not here.

### Cloudflare R2 CORS

Browsers upload media straight to the bucket, so it needs a CORS rule. Use the R2 bucket settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

## Scripts

| Command | Purpose |
| --- | --- |
| `bun dev` | Development server |
| `bun run build` / `bun start` | Production build (needs a migrated database) and serve |
| `bun run lint` | ESLint |
| `bun run typecheck` | Generate route types and run TypeScript |
| `bun run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Browse the database |
| `bun run make-admin <email>` | Grant admin access |

## bKash payments

Turn bKash on in **Admin → Settings → bKash payments** and enter the store's bKash number and account type. The account type sets the wording customers see: Personal uses "Send Money", Agent "Cash Out" and Merchant "Payment". At checkout the customer sends the order total to that number, then enters the TrxID and the number they paid from.

The order arrives with payment status `pending`. On the order page in the admin panel, look the TrxID up in your bKash account, then press **Payment received** or **Not received**. A bKash order can only be confirmed after its payment is verified. If a payment is marked not received, the customer can send a corrected TrxID from their order page. If a paid order is cancelled or rejected, send the money back in bKash and press **Record refund**. Each TrxID can be used for one order only.

## Adding an online payment gateway later

Orders already record `paymentMethod` and `paymentStatus`, and every money movement is a row in `transaction` with gateway fields (`providerTransactionId`, `providerSessionId`, `providerPayload`). The `paymentProvider` enum already includes `sslcommerz` and `paystation`. A gateway integration needs to:

1. Create the order and a `pending` transaction.
2. Redirect the customer to the gateway.
3. Mark the transaction `succeeded` or `failed` from the gateway's IPN/validation callback.
