# SRI BALAJI PERFUMERY — Production E-Commerce Application

An authentic, database-backed online store for **Sri Balaji Perfumery**, selling traditional Indian agarbatti (incense sticks), dhoop cones, cup sambranis, dhoop sticks, and sacred pooja essentials.

---

## 1. Key Business & Architectural Features

- **Market Territory:** India Only (`IN`). Deliveries outside India are strictly disallowed.
- **Currency:** Indian Rupee (`₹` / `INR`) with tabular numeral formatting.
- **No Cash on Delivery (COD):** Online payment only via Razorpay (UPI, RuPay, Credit/Debit Cards, NetBanking).
- **Courier Delivery & PIN Validation:** Live 6-digit Indian Postal PIN code validation and serviceability check.
- **Trusted Server-Side Pricing:** All calculations (subtotal, percentage/flat coupons, courier shipping fee, 5% GST) are computed and revalidated on the server. Client prices are never trusted.
- **Three.js 3D Ritual Showcase:** Interactive 3D Brass Dhoop Dani / Sambrani Burner with procedural smoke particle dynamics, PBR studio lighting (`RoomEnvironment` + `PMREMGenerator`), and collapsible bottom controls.
- **AI Scent Sommelier:** Server-side Gemini intelligence (`/api/gemini/advisor`) recommending auspicious temple fragrances for specific puja rituals and meditation.
- **Full Admin Console (`/admin`):**
  - Product catalog management (create, edit, publish/unpublish, stock updates, variants).
  - Courier order fulfillment (assign courier like BlueDart/Delhivery, enter AWB tracking numbers, lifecycle state machine).
  - Printable official GST Tax Invoice download (`INV-SBP-...`).
  - Audit logging of all administrative operations.

---

## 2. Admin Credentials & First-Admin Provisioning

- **Admin URL:** Click the shield icon in the top navigation or visit `/admin`
- **Default Username:** `admin`
- **Default Password:** `Balaji@2026`
- **Password Security:** PBKDF2 with 10,000 iterations and cryptographic salt.

---

## 3. Database & Migrations

The full Supabase PostgreSQL schema and Row Level Security (RLS) policies are located at:
`supabase/migrations/20261020000000_sri_balaji_schema.sql`

Includes:
- Tables: `products`, `product_variants`, `product_images`, `categories`, `orders`, `order_items`, `payments`, `payment_webhook_events`, `coupons`, `store_settings`, `audit_logs`
- Strict RLS policies separating public catalog access from customer order isolation and admin privileges.

---

## 4. Payment Gateway Configuration (Razorpay)

To activate live or test payments:
1. Obtain your API keys from the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Configure the following environment variables in `.env`:
   ```bash
   RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
   RAZORPAY_KEY_SECRET="YourKeySecretHere"
   RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"
   ```
3. When keys are pending, the checkout automatically presents an explicit setup instruction modal and provides a verified sandbox confirmation test mode.

---

## 5. Automated Tests

Run the test suite with:
```bash
npm test
```
Verifies 10 core commerce rules:
- 6-digit Indian PIN code format and serviceability whitelist/blocklist
- Order pricing, free shipping threshold (₹499), and 5% GST tax calculation
- Variant pricing overrides
- Percentage and flat coupon eligibility
- Order status lifecycle transitions
- Razorpay HMAC-SHA256 signature verification and forged signature rejection
- Atomic inventory reservation and overselling prevention.
