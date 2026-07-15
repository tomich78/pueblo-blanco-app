# Pueblo Blanco Libros

Full-stack e-commerce platform for an independent bookstore, built solo end-to-end — from product catalog to checkout to production deployment.

🔗 **Live:** [www.puebloblancolibros.com.ar](https://www.puebloblancolibros.com.ar)

<!-- Screenshots: add 2–3 images here (home, checkout, admin panel)
![Home](./screenshots/home.png)
![Admin](./screenshots/admin.png)
-->

---

## Overview

A real production app used daily by the store. Customers can browse and search the catalog, add books to cart, and pay via Mercado Pago (Argentina's leading payment gateway) or bank transfer. The store owner manages everything through a custom-built admin panel — no third-party CMS involved.

---

## Features

### Customer-facing
- Browsable and searchable book catalog with cover images, author, publisher, and price
- Shopping cart with persistent state
- Checkout as guest or registered user
- Payment via **Mercado Pago** (credit/debit card) or **bank transfer** (with proof-of-payment upload)
- Order tracking page — customers can look up their order by ID or email
- Transactional emails on order confirmation and payment approval (styled HTML, sent via Resend)
- User accounts with password reset flow
- Dark mode

### Admin panel
- Full book CRUD: create, edit, delete, toggle visibility
- **Barcode scanner** — point the camera at any book's barcode to auto-fill title, author, publisher, description, and cover image (via Open Library + Google Books APIs)
- **ISBN lookup** — type an ISBN manually and fetch the same data with one click
- **Camera capture** — take a cover photo directly from the device camera and upload it to Supabase Storage
- Physical stock management by storage box (*caja*): track exactly which physical box each copy is in
- When confirming a paid order, the admin assigns stock from specific boxes; cancellations automatically restore stock to the correct boxes
- Box management panel: create boxes, browse their contents, add books to boxes
- Order management with status flow (pending → confirmed → shipped → delivered / cancelled)
- Webhook integration with Mercado Pago for automatic payment confirmation
- Sales history panel showing imported records from the legacy PHP+MySQL system
- Category management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (end-to-end, no separate backend) |
| UI | React 19, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Payments | Mercado Pago SDK + webhooks |
| Email | Resend |
| Barcode scanning | `@zxing/browser` |
| Book data APIs | Open Library API, Google Books API |
| Cart state | Zustand |
| Deployment | Vercel |
| DNS | Vercel DNS (custom domain) |

---

## Architecture Highlights

**Single-language stack.** Everything is TypeScript. Next.js API routes handle all server-side logic — there is no separate backend service.

**Row Level Security.** All Supabase tables are protected by RLS policies. A `security definer` helper function (`is_admin()`) prevents RLS recursion when admin policies query the `profiles` table.

**Trigger-based stock sync.** A PostgreSQL trigger on the `ubicaciones` (stock-by-box) table automatically keeps `books.stock` in sync with the sum of all box quantities. All existing code that reads `books.stock` works without changes.

**Safe stock operations.** A dedicated `order_item_cajas` audit table records which box each sold unit came from. Cancellations restore stock to the exact original boxes. When swapping boxes after payment, the new boxes are decremented first — if any fail (insufficient stock), already-decremented boxes are reverted before aborting.

**Webhook reliability.** Mercado Pago webhooks can arrive before the admin page refreshes. The cancel flow was designed to check for `order_item_cajas` rows rather than relying on the in-page status, avoiding a race condition that would silently skip stock restoration.

**Legacy data migration.** Imported 963 books and their physical locations from an old PHP+MySQL dump, using a custom Node.js migration script that cross-referenced two inventory spreadsheets to reconcile stock counts. Historical sales records (58 orders) were imported into read-only tables, keeping them separate from the current order flow.

---

## Local Setup

```bash
# Clone and install
git clone https://github.com/tomich78/pueblo-blanco-app.git
cd pueblo-blanco-app
npm install

# Environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN,
#          RESEND_API_KEY, NEXT_PUBLIC_SITE_URL

# Run database migrations (in order)
# Apply supabase/schema.sql and supabase/v*.sql files via the Supabase SQL editor

# Start dev server
npm run dev
```

---

## Author

Built and maintained by [Tomás Degano Sal](https://github.com/tomich78).
