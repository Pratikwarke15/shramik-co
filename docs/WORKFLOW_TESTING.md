# Workflow & Regression Testing Guide

This document provides step-by-step verification for every critical platform workflow.

---

## 1. Consumer Auth Isolation (Account A ≠ Account B)

**Goal:** Confirm that switching between consumer accounts does not leak cached server data.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open an incognito window, register Consumer A (`9811111111` / `password123`). | Redirected to `/consumer/dashboard`. |
| 2 | Navigate to **My Bookings** and **Wallet** — make 2–3 bookings, fund wallet. | Bookings and balance are visible. |
| 3 | Open a second incognito window, register Consumer B (`9822222222` / `password123`). | Redirected to `/consumer/dashboard`. |
| 4 | Navigate to **My Bookings** — should be empty. | **Empty.** No bookings from Consumer A appear. |
| 5 | Back in Consumer B window, click **Logout**. | Redirected to `/login`. |
| 6 | Log in as Consumer A. Navigate to **My Bookings**. | Consumer A's bookings are shown correctly. |

**What was broken before:** The Zustand store + localStorage were cleared on logout, but the React Query cache (which holds `/api/bookings`, `/api/wallet/*` responses) persisted across account switches.

**Fix applied:** `queryClient.clear()` is now called on every `login()` and `logout()` via the shared singleton in `apps/web/src/lib/queryClient.ts`.

---

## 2. Worker Approval Gating

**Goal:** New worker sign-ups must NOT be visible to nearby-workers search until a co-op admin approves them.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Register a new worker (`9833333333` / `password123`). | Profile created with `status: PENDING_ADMIN_APPROVAL`. |
| 2 | As a Consumer, search nearby-workers. | The new worker does **not** appear in results. |
| 3 | Log in as Co-op Admin (`9890000001` / `admin123`). Navigate to **Workers**. | New worker appears with `PENDING_ADMIN_APPROVAL` status. |
| 4 | Click **Approve** on the worker. | Status changes to `VERIFIED`. |
| 5 | As the Consumer, search nearby-workers again. | Worker now appears in results. |

**API endpoints:**
- `POST /api/v1/coops/:coopId/workers/:workerId/approve` — sets `status: VERIFIED`
- `POST /api/v1/coops/:coopId/workers/:workerId/reject` — sets `status: SUSPENDED`

---

## 3. Razorpay Checkout (Consumer)

**Goal:** Full payment flow — create order, Razorpay SDK checkout, signature verification, booking confirmation.

| Step | Action | Expected |
|------|--------|----------|
| 1 | As Consumer, go to **Book Service** → select a service. | Service selected, price shown. |
| 2 | Enter address, continue to worker selection → confirm. | Booking summary displayed. |
| 3 | Click **Confirm & Pay**. | Razorpay checkout modal opens (test mode). |
| 4 | Complete payment with test card `4111 1111 1111 1111`, CVV `123`, expiry `12/26`. | Modal closes. |
| 5 | Verify success alert appears. | "Booking confirmed and payment successful!" |

**API flow (3-step):**
1. `POST /api/v1/payments/create-order` → returns Razorpay `order_id`
2. `POST /api/v1/payments/verify-signature` → validates Razorpay HMAC signature
3. `POST /api/v1/payments/verify` → confirms booking payment & creates wallet records

**Commission calculation (for ₹500 booking):**
- Commission = ₹500 × 4% = ₹20
- Worker payout = ₹480

---

## 4. Multilingual Switch (en → hi → mr)

**Goal:** All UI strings update correctly when the language is switched from the header.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open any page. Click the language selector in the navbar. | Three options visible: English, हिन्दी, मराठी. |
| 2 | Select **हिन्दी (Hindi)**. | Labels change: "Book Service" → "सेवा बुक करें", "Login" → "लॉगिन", etc. |
| 3 | Select **मराठी (Marathi)**. | Labels change: "Book Service" → "सेवा बुक करा", "Login" → "लॉगिन". |
| 4 | Switch back to **English**. | All labels revert to English. |
| 5 | Refresh the page. | Language preference persists (stored in Zustand `user.locale`). |

---

## 5. Android APK (Capacitor)

**Goal:** Generate a debug APK from the Next.js web app using Capacitor.

> **Note:** Building the APK requires Android SDK (Android Studio). In CI without Android SDK, the build will produce the web assets (`cap sync`) but cannot compile the APK natively.

### Prerequisites
```bash
cd apps/web
npm install          # includes @capacitor/core, @capacitor/cli, @capacitor/android
```

### Generate APK (local machine with Android Studio)
```bash
npm run build:web   # builds Next.js + syncs Capacitor
npm run build:android  # opens Android Studio with the native project
# In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### CI/CD (no Android SDK)
```bash
npm run build:web   # produces .next + cap sync
# Upload android/ folder as artifact
# Use a separate Android build pipeline (GitHub Actions with java setup, or EAS Build)
```

### Capacitor Config
`apps/web/capacitor.config.ts`:
- **appId:** `com.coopgig.app`
- **appName:** `CoopGig`
- **webDir:** `.next`

---

## 6. End-to-End Smoke Test (curl)

Run from the project root to validate core API workflows:

```bash
# Health
curl https://coopgig-api.onrender.com/api/v1/health

# Register a new consumer
curl -s -X POST https://coopgig-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"9899999999","password":"test1234","name":"Test","role":"CONSUMER"}'

# Login
curl -s -X POST https://coopgig-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9899999999","password":"test1234"}'
# Copy the token from the response

# AI Demand Forecast (Co-op Admin or Ministry only)
curl https://coopgig-api.onrender.com/api/v1/analytics/demand-forecast \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## Quick Reference: Account Credentials

| Role | Phone | Password |
|------|-------|----------|
| Consumer (seed) | 9812345601 | password123 |
| Worker (seed) | 9876543201 | password123 |
| Co-op Admin (seed) | 9890000001 | password123 |
| Ministry Admin (seed) | 9999999999 | admin123 |

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://web-two-navy-cgys7gjlkl.vercel.app |
| API      | https://coopgig-api.onrender.com |
| Swagger  | https://coopgig-api.onrender.com/api/docs |
| GitHub   | https://github.com/coopgig/coopgig |
