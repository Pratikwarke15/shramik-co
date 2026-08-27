# Shramik Co — Cooperative Gig Services Platform for Household & Community Services

**SIH26089** — A production-ready full-stack platform that empowers local workers through
cooperative gig services with fair commissions (<5%), social security contributions, AI-driven
demand forecasting, and transparent cooperative governance.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 14)                      │
│   PWA · App Router · TypeScript · TailwindCSS · i18n (en/hi/mr)    │
│   Roles: Consumer · Worker · Co-op Admin · Federation Admin        │
│   Deployed: Vercel                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTPS / JSON (CORS, JWT Bearer)
┌───────────────────────────▼─────────────────────────────────────┐
│                         API (Express + TypeScript)                 │
│   Auth · Bookings · Workers · Co-ops · Payments · Disputes ·       │
│   Social-Security · Upload · Analytics (AI Forecast) · WebSocket   │
│   Deployed: Render (free tier)                                     │
└───────────────────────────┬─────────────────────────────────────┘
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌────────────┐   ┌──────────────┐   ┌──────────────┐
     │  Supabase   │   │   Razorpay   │   │  2Factor /   │
     │ PostgreSQL  │   │  (Test Mode) │   │  Console OTP │
     │ (Pooler)    │   │  Payments    │   │  SMS         │
     └────────────┘   └──────────────┘   └──────────────┘
```

### Tech Stack

| Layer        | Technology |
|--------------|-----------|
| Frontend     | Next.js 14 (App Router), TypeScript, TailwindCSS, TanStack Query, React Hook Form, Zod, `next-pwa` |
| Backend      | Express 5, TypeScript, Zod validation, Winston logging, Helmet, CORS, Socket.IO |
| Database     | Supabase PostgreSQL (connection pooler / PgBouncer) + Prisma ORM |
| Auth         | JWT (access token) + phone/OTP verification (2Factor SMS with dev console fallback) |
| Payments     | Razorpay Test Mode (UPI / card mock, escrow-held commission model) |
| File Storage | Supabase Storage |
| Geospatial   | Application-level Haversine radius matching (PostGIS-compatible schema fields) |
| AI/ML        | Statistical demand-forecasting engine (seasonal-weighted history + linear-trend regression) |
| i18n         | Custom lightweight provider with English, Hindi, Marathi catalogs |
| Infra        | Vercel (web) + Render (API), GitHub monorepo |

---

## 🚀 Local Setup

### Prerequisites
- Node.js ≥ 18, npm ≥ 9
- A Supabase project (PostgreSQL + Storage bucket)
- Razorpay test keys (free)
- 2Factor SMS API key (free) — optional; dev console fallback works without it

### 1. Clone & install
```bash
git clone https://github.com/coopgig/coopgig.git
cd coopgig
npm install
```

### 2. Environment variables
Copy the template and fill values (see `.env` and `apps/web/.env.local`):

```bash
# apps/api — root .env (or set in Render)
DATABASE_URL="postgresql://USER:PASS@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
JWT_SECRET="<strong-random-secret>"
CORS_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxx"
SMS_API_KEY="<2factor-key>"          # optional
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_ANON_KEY="xxxx"
SUPABASE_SERVICE_KEY="xxxx"
```

> **Important (Supabase pooler):** always append `&pgbouncer=true&connection_limit=1` to
> `DATABASE_URL`. Prisma uses prepared statements that conflict with PgBouncer's transaction
> pooling; this flag disables them. Without it every write query fails with
> `42P05 prepared statement "s0" already exists`.

### 3. Database & seed
```bash
npx prisma generate --schema=packages/db/prisma/schema.prisma
npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
# or for a fresh DB:
npx prisma db push --schema=packages/db/prisma/schema.prisma
npm --workspace apps/api run seed
```

### 4. Run locally
```bash
# Terminal 1 — API
cd apps/api && npm run dev          # http://localhost:4000  (docs: /api/docs)

# Terminal 2 — Web
cd apps/web && npm run dev          # http://localhost:3000
```

---

## 🧪 Testing Guide

### Register / Login
1. Open `http://localhost:3000/register`.
2. Choose **Hire Workers** (Consumer) or **Work & Earn** (Worker), enter name + 10-digit phone + password (min 6).
3. Email is optional. OTP step uses the dev console fallback (see below).
4. Seed accounts (password `password123`):
   - Consumer: `9812345601`–`9812345604`
   - Worker: `9876543201`–`9876543212`
   - Co-op Admin: `9890000001`–`9890000004`
   - Federation Admin: `9999999999` / `admin123`

### Retrieve Dev OTP
- **2Factor (production):** real SMS is sent; OTP appears in the 2Factor dashboard.
- **Dev / console fallback:** when `SMS_API_KEY` is unset or SMS fails, the OTP is logged to the
  API server console (`OTP for <phone>: 123456`) and can be returned via the
  `POST /api/v1/auth/send-otp` response in non-production. Use the same OTP in
  `POST /api/v1/auth/verify-otp`.

### Test Payments (Razorpay Test Mode)
1. Create a booking as a Consumer → `POST /api/v1/payments/initiate`.
2. Response returns `mockVpa` (e.g. `coopgig-xxxx@upi`) and `paymentRef`.
3. In test mode no real charge occurs; confirm with `POST /api/v1/payments/confirm` using the
   `razorpay_order_id`/`razorpay_payment_id` returned by `POST /api/v1/payments/create-order`
   (use Razorpay test card `4111 1111 1111 1111`, any future expiry, any CVV).
4. Commission (≤5%) is held in escrow; the remainder is routed to the worker wallet.

### AI Demand Forecasting
```bash
curl -H "Authorization: Bearer <COOP_ADMIN_TOKEN>" \
  "https://<api>/api/v1/analytics/demand-forecast?days=7&condition=HEAVY_RAIN&temperatureC=30"
```
Returns a 7-day forecast per service category, demand hotspots per co-op, and workforce
allocation recommendations. Weather multipliers (rain/heatwave) raise predicted demand.

### Automated endpoint checks
```bash
# from repo root, after starting the API
bash scripts/smoke-test.sh     # optional helper (create if needed)
```

---

## 🌐 Multilingual Support (i18n)
Languages: **English (en)**, **Hindi (हिन्दी)**, **Marathi (मराठी)**.
- Switch via the globe `LanguageSelector` (top-right of every page, including login/register).
- Preference persisted in `localStorage` (`coopgig_lang`) and applied to `<html lang>`.
- Catalogs live in `apps/web/src/i18n/messages/{en,hi,mr}.json`.
- Use `const { t } = useI18n()` and `t("auth.welcomeBack")` in any client component.
- To add a language: add a JSON catalog + an entry in `LOCALES` (`I18nProvider.tsx`).

---

## 📦 Project Structure
```
packages/db/prisma/      Prisma schema + seed
apps/api/                Express API (routes, services, middleware, lib)
apps/web/                Next.js frontend (app, components, i18n, store)
```

---

## 🔐 Security & Compliance Notes
- JWT secrets via env; tokens are `Bearer` in `Authorization`.
- CORS restricted to `CORS_ORIGIN` (Vercel URL in prod) with credentials.
- Commission cap enforced server-side (`MAX_COMMISSION_RATE`, default 5%).
- File uploads scoped to authenticated users; stored in Supabase Storage.
- All inputs validated with Zod schemas; unknown fields stripped.

## 📄 API Documentation
Interactive Swagger UI: `https://<api>/api/docs`

## 🤝 Contributing
Monorepo uses npm workspaces. Run `npm install` at root. Lint/typecheck before PRs.
