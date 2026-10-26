# Security Roadmap — Digital Storefront (web + admin)

_Audit date: 2026-09-27 · Scope: every tracked source file in `apps/web`, `apps/admin`, `packages/*`, the Prisma schema, migrations, and the Supabase SQL in `packages/database/prisma/sql/`. Also `npm audit` (production deps only). No live Supabase, Vercel, or Razorpay dashboards were inspected, so every finding marked **[verify live]** has to be checked against the real project before it is marked fixed._

---

## 0. Implementation status (updated 2026-09-27, branch `security/hardening`)

**Live check, before any change:** `npm run check:data-api --workspace=@repo/database` got **zero rows** from every table using the public key. That includes `_prisma_migrations`, which certainly has rows. So RLS was already on in the live storefront project (it was probably enabled from the dashboard), and **C1 was not an active leak**. The new migration puts that protection in code and also revokes the `anon`/`authenticated` privileges that remained.

| Finding | Status | Where |
|---|---|---|
| C1 Data API exposure | ✅ code: migration `20260927100100_lock_down_data_api` (RLS on every table, privileges revoked, default privileges locked) + `prisma/sql/auto_enable_rls.sql` + `check:data-api` script · ⏳ **apply migration, run the SQL once** | `packages/database` |
| C2 Payment replay | ✅ gateway order bound to the order, Razorpay payment fetched to check amount/currency/captured, `gatewayPaymentId @unique`, atomic settle shared with the webhook | `apps/web/app/(checkout)/actions.ts`, `apps/web/lib/orders.ts` |
| C3 Checkout eligibility | ✅ zod schema, published/stock/format checks, amount bounds, rate limit | same |
| Coupon list leaked to every visitor *(found during implementation)* | ✅ codes checked server-side (`checkCoupon`), stripped from client props (`publicPricing`), no "try CODE" hint | `apps/web` |
| Fake sample orders shown to real customers *(found during implementation)* | ✅ account pages read real data only | `apps/web/app/(account)` |
| H1 Open redirect | ✅ `safeNextPath` on both sign-in pages and the proxy · ⏳ exact redirect-URL allowlist in both Supabase projects | `packages/security/src/redirect.ts` |
| H2 Admin auth fail-open | ✅ proxy returns 503, `instrumentation.ts` refuses to boot, service-role key no longer falls back across projects | `packages/auth/src/env.ts`, `apps/admin/instrumentation.ts` |
| H3 E-book entitlement | ✅ `OrderItem.includesEbook`, per-customer `LibraryDownload`, atomic claim, refunded or cancelled orders lose access · ⏳ apply migration | `apps/web/lib/library.ts` |
| H4 Security headers | ✅ nonce CSP (enforced), HSTS (production only), frame, referrer, permissions, COOP, `X-Robots-Tag` on admin, `no-store` on admin and account pages | `packages/security/src/headers.ts`, both `proxy.ts` / `next.config.ts` |
| H5 Staff MFA and passwords | ✅ 12-character staff minimum, sessions signed out on password change · ❌ TOTP MFA was built and then removed by decision — staff sign in with email + password only (accepted risk) · ⏳ Supabase Auth settings (below) | `apps/admin/lib/passwords.ts`, `packages/auth` |
| M1 Webhook hardening | ✅ length-safe HMAC compare, fails closed without a secret, 401 on bad signature, safe parse, size cap | `packages/payments/src/signature.ts` |
| M2 Rate limiting | ✅ checkout, coupon, account writes, library, books API, webhook, invite redemption, uploads, password check · ⏳ set `UPSTASH_REDIS_REST_*` (without them the limits are per instance only) | `packages/security/src/rate-limit.ts` |
| M3 Unsafe CMS links | ✅ `safeHref`/`httpsUrl` in every admin schema, plus render-side guards in the web footer and hero | `apps/admin/lib/schema-fields.ts` |
| M4 Invite host header | ✅ `NEXT_PUBLIC_ADMIN_URL` required in production | `apps/admin/lib/staff-invites.ts` |
| M5 Raw error text | ✅ fixed generic messages on sign-in, forgot/reset password, join, and password change | both apps |
| M6 E-book upload | ✅ path pattern and `%PDF-` magic-byte check before attaching · ⏳ run `harden-buckets` | `packages/storage` |
| M7 Malware scan | ✅ real Cloudmersive scan that fails closed (stays `PENDING`), private staging, quarantine | `packages/jobs/src/functions/malwareScan.ts` |
| M8 Proxy matcher and page guards | ✅ anchored public paths, `requireStaffPage()` on all 32 data-reading admin pages | `apps/admin/proxy.ts`, `apps/admin/lib/guard.ts` |
| M9 Inngest | ✅ boot check rejects `INNGEST_DEV` in production | `apps/web/instrumentation.ts` |
| M10 Secret sprawl | ✅ admin no longer depends on payments or jobs, env examples trimmed, boot check rejects secrets in `NEXT_PUBLIC_*` · ⏳ move to per-app Supabase secret keys | env examples |
| M11 Swallowed errors | ✅ `withFallback` logs errors · ⏳ Sentry | `apps/web/lib/safe-fetch.ts` |
| M12 Vulnerable deps | ❌ not done: needs Prisma 8 and `@react-email/components` 1.x major upgrades. CI reports these without blocking | — |
| L1–L7 | ✅ exact email match, atomic invite claim, `no-referrer` on token pages, subject sanitising, `server-only` guards · L5 (audit diff hygiene) unchanged: no secrets are logged today | various |
| CI | ✅ `.github/workflows/security.yml` (typecheck, lint, Vitest, npm audit, gitleaks, CodeQL), Dependabot | `.github/` |
| Incident response | ✅ [security-incident-response.md](security-incident-response.md) | `docs/` |

**Not done yet** (outside this change, or needs a decision):
- DPDP customer self-service: account deletion and data export.
- Sentry or another log drain, with 180-day retention.
- App-level tests (checkout replay, authorization matrix) and running the RLS check in CI against staging.
- Least-privilege DB role: the SQL is ready in `prisma/sql/app_runtime_role.sql`, but applying it is a manual step.
- Prisma and react-email major upgrades.
- A ZAP scan and a penetration test before launch.

### Manual steps, in order

1. **Apply the migrations** against the storefront DB: `npm run migrate:deploy --workspace=@repo/database` (or `npm run db:migrate` in dev). Then run `npm run db:generate`.
2. Storefront Supabase SQL editor: run `packages/database/prisma/sql/auto_enable_rls.sql` once.
3. `npm run check:data-api --workspace=@repo/database`: every table should now show `blocked`.
4. `npm run harden-buckets --workspace=@repo/storage` (sets the MIME and size limits on the `ebooks` and `images` buckets).
5. **Admin Supabase project → Authentication:**
   - Turn off "Allow new users to sign up" (this blocks OAuth sign-ups too).
   - Set minimum password length to 12 and enable leaked-password protection.
   - Enable Secure email change and Secure password change.
   - Set URL Configuration → Redirect URLs to the exact admin origin(s).
   - Shorten the JWT expiry (for example 900s).
6. **Storefront Supabase project → Authentication:**
   - Set minimum password length to 8 and enable leaked-password protection.
   - Enable email confirmation.
   - Set Redirect URLs to the exact storefront origin(s).
   - Check the rate limits.
   - Optional: remove `public` from Settings → API → Exposed schemas (nothing uses it).
7. **Vercel:**
   - Set `NEXT_PUBLIC_ADMIN_URL` on admin, and `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` on both apps.
   - Mark secrets as Sensitive.
   - Enable Deployment Protection on admin previews.
   - Put preview deployments on Razorpay **test** keys.
8. **GitHub:** enable secret scanning, push protection and Dependabot security updates, and protect `main` so it requires the `security` workflow to pass.

---

## 1. Summary

The code is in better shape than most apps at this stage. Server Actions call `assertRole()` consistently (15 admin action files checked, all gated). Prices are re-derived on the server. The invite token is hashed. Image uploads are checked by magic bytes, and SVG is rejected. The auth identity is always checked with `getUser()`, never trusted from `getSession()`.

The serious risks are in a few specific places, and three of them can leak data or money today:

| # | Risk | Severity | Where |
|---|------|----------|-------|
| C1 | Almost every business table is readable and writable by anyone holding the public Supabase key, unless RLS was enabled by hand | **Critical** [verify live] | `packages/database/prisma/sql/sync_user.sql:33-48` |
| C2 | One real payment can mark any number of other orders `PAID` | **Critical** | `apps/web/app/(checkout)/actions.ts:182-233` |
| C3 | Unpublished and out-of-stock products can still be bought | **High** | `apps/web/app/(checkout)/actions.ts:70-74` |
| H1 | Open redirect after sign-in on both apps | **High** | `apps/web/app/sign-in/page.tsx:21,50,59`, `apps/admin/app/sign-in/page.tsx:22,42,51` |
| H2 | If the admin auth env vars are missing, admin silently authenticates against the public storefront project | **High** | `packages/auth/src/env.ts:16-33` |
| H3 | Buying the print edition unlocks the e-book, and the download limit is shared by all buyers | **High** (revenue + availability) | `apps/web/app/api/library/[assetId]/route.ts:21-28` |
| H4 | No security headers at all (no CSP, HSTS, frame protection, or referrer policy) | **High** | `apps/web/next.config.ts`, `apps/admin/next.config.ts` |
| H5 | No MFA and weak password minimums for staff | **High** | admin auth project, `apps/admin/app/reset-password/page.tsx:57`, `account-client.tsx:179` |

The rest are Medium or Low findings, listed in §3. The roadmap in §4 orders the work so the leaks close first.

---

## 2. Threat model (short)

**What we protect:** customer PII (names, emails, addresses, phones, order history), paid e-book files, payment integrity (orders marked `PAID`), pricing and discount codes, staff accounts (an Owner account controls everything), and CMS content (a defaced storefront or an injected link).

**Who attacks:**
1. **Anonymous internet users.** They can see the public Supabase URL and publishable key, because both are shipped in the browser bundle by design.
2. **Signed-in customers.** Anyone can sign up on the storefront, so assume attackers have an account.
3. **Phished or compromised staff.** Staff reach the whole back office through one password.
4. **Supply chain.** npm dependencies and the Razorpay checkout script.

**Trust boundaries:** browser → Next.js (`proxy.ts`, Server Actions, Route Handlers) → Prisma (uses the `postgres` role and **bypasses RLS**) / Supabase REST (uses the anon or authenticated role and **is subject to RLS**) / Supabase Storage / Razorpay / Resend / Inngest.

The key point: **the apps' own queries bypass RLS, but anyone can also reach the same tables directly over Supabase's REST API with the public key.** RLS is the only thing that stops the second path.

---

## 3. Findings register

### C1 — Business tables exposed through the Supabase Data API **[Critical, verify live]**

`sync_user.sql` enables RLS on only 3 tables: `users`, `orders`, `self_publishing_projects`. Prisma migrations create 28 more tables in `public` and never enable RLS: `addresses`, `order_items`, `payments`, `file_assets`, `audit_logs`, `staff_invites`, `discount_codes`, `pricing_settings`, `products`, `wishlists`, `notifications`, `royalties`, `reviews`, `service_requests`, `vendors`, `purchase_orders`, `purchase_order_items`, `site_settings`, `banners`, `nav_links`, `faqs`, `testimonials`, `content_blocks`, `class_set_tiers`, `menu_categories`, `menu_products`, `department_visibility`, `_prisma_migrations`.

On Supabase, `public` is exposed through PostgREST by default, and `anon`/`authenticated` have table privileges on it. So with only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (both public), anyone can do the following:

```
GET   /rest/v1/addresses?select=*               → every customer's address and phone
GET   /rest/v1/audit_logs?select=*              → staff emails and change history
POST  /rest/v1/discount_codes {code,rateBps:10000} → a 100%-off coupon
PATCH /rest/v1/products?id=eq.X {priceCents:100}   → reprice anything
PATCH /rest/v1/file_assets?... {blobPath:...}       → swap an e-book for malware
```

Checkout reads `discount_codes` and `products` through Prisma, so write access here turns directly into free orders.

**How to confirm (in the storefront project's SQL editor):**
```sql
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by 2, 1;
```
Also check the Supabase dashboard's **Advisors → Security** page, which flags `rls_disabled_in_public`.

**Fix:** see Phase 0, task 0.1.

---

### C2 — Payment-signature replay across orders **[Critical]**

`confirmCheckout` checks that `(razorpayOrderId, razorpayPaymentId, signature)` is a genuine Razorpay triple. It never checks that `razorpayOrderId` belongs to `input.orderId`:

```ts
// actions.ts:186-205
verifyPaymentSignature({ orderId: input.razorpayOrderId, ... })   // proves order A was paid
const order = await prisma.order.findUnique({ where: { id: input.orderId } })  // order B
if (order.status !== "PAID") await prisma.order.update({ ...status: "PAID" })   // B marked paid
```

**Attack:** pay ₹10 for order A and keep the three values Razorpay returns. Create order B for ₹10,000 and never pay it. Call `confirmCheckout({ orderId: B, <A's values> })`. Order B becomes `PAID`, e-books unlock, and physical stock ships. The same receipt works for unlimited orders.

**Fix (in `confirmCheckout`):**
- Load `order.payment` and require `order.payment.gatewayOrderId === input.razorpayOrderId`.
- Require that `gatewayPaymentId` isn't already recorded against another payment (add `@unique` to `Payment.gatewayPaymentId`).
- Optionally fetch the payment from Razorpay (`payments.fetch`) and check `amount === order.totalCents`, `status === "captured"`, and `order_id === gatewayOrderId`.
- Make the PENDING → PAID transition atomic: `updateMany({ where: { id, status: "PENDING" } })`, then fire Inngest only when `count === 1`. That closes the webhook/confirm race that can send two emails.

**Apply the same checks to the webhook** (`route.ts:21-56`): compare `payment.entity.amount` and `currency` against `Payment.amountCents`, and use the same atomic transition.

---

### C3 — Checkout sells unpublished and out-of-stock items **[High]**

`startCheckout` looks products up by id with no `isPublished: true` filter (`actions.ts:70`), and it ignores `stockQty` and `inventoryStatus`. Product ids (cuids) show up in admin URLs, old links, and the cart's localStorage, so a draft or withdrawn title (or a ₹0 test product) can still be bought.

Input is also barely validated. `quantity` is only `Math.max(1, Math.round(q))`, so `NaN` or `1e9` reaches Prisma: `NaN` throws, and `1e9 × price` overflows `Int` cents. There is no cap on line items.

**Fix:** add a zod schema (quantity integer 1–100, at most 50 lines, `speed` enum, coupon regex). Filter on `isPublished: true`. Reject `inventoryStatus: OUT_OF_STOCK`/`COMING_SOON`, and reject `stockQty < qty` when stock is tracked. Reject totals under Razorpay's minimum. Check the e-book edition against `bookFormats` before accepting a `:ebook`/`:both` line (`splitLineId`, `actions.ts:51`).

---

### H1 — Open redirect on sign-in (both apps) **[High]**

`next = searchParams.get("next")` is passed straight to `router.push(next)` and to the OAuth `redirectTo`. `/sign-in?next=https://evil.example` or `?next=//evil.example` sends a user who just signed in to an attacker's page, which makes phishing links look legitimate ("sign in again"). It matters most on the admin app.

**Fix:** add a shared `safeNextPath(raw, fallback)` helper in `packages/auth`. It should accept only values that start with a single `/`, don't start with `//` or `/\`, and contain no scheme. Use it in both sign-in pages and in `createAuthMiddleware`. Also set Supabase **Auth → URL Configuration → Redirect URLs** to exact origins, with no wildcards in production.

---

### H2 — Admin auth fails open to the public project **[High]**

`authSupabaseUrl()` falls back to `NEXT_PUBLIC_SUPABASE_URL` when `NEXT_PUBLIC_AUTH_SUPABASE_URL` is unset, and `authSupabaseServiceRoleKey()` falls back the same way. If a production admin deploy loses that env var (a new Vercel project, a renamed variable, a preview environment), the back office authenticates against the storefront project, where **anyone can sign up**. The only remaining barrier is the `role` column in the storefront's `users` table. That table has RLS on `users` today, but a single mistaken `update users set role='OWNER'` or a future policy change would hand over the back office.

**Fix:** add an `ADMIN_APP=true` flag (or a `requireDedicatedAuthProject` option). When it's set and `NODE_ENV==="production"`, throw at startup if either `NEXT_PUBLIC_AUTH_SUPABASE_*` or `AUTH_SUPABASE_SERVICE_ROLE_KEY` is missing. Never fall back in production.

---

### H3 — E-book entitlement and download limit **[High]**

- **Wrong entitlement.** `/api/library/[assetId]` (`route.ts:21`) and the library page grant the PDF to anyone with *any* PAID `OrderItem` for the product, including a `fulfillmentType: "SHIP"` print-only purchase. Require `fulfillmentType === "DIGITAL"` or a "both" line (store the edition on `OrderItem` rather than inferring it).
- **Global limit.** `downloadCount`/`maxDownloads` live on the `FileAsset` row and are shared by **every** buyer (`route.ts:24-28`). After 5 downloads in total, every customer is locked out. Move the count to a per-user entitlement row (for example `Entitlement { userId, fileAssetId, downloadCount }`).
- **Race.** The count check and the increment aren't atomic. Use `updateMany({ where: { id, downloadCount: { lt: max } }, data: { increment } })` and check `count`.
- **Unbounded query.** `include: { product: { include: { orderItems: { include: { order } } } } }` loads every order ever placed for that product on each request. Query `orderItem.findFirst({ where: { productId, order: { userId, status: "PAID" } } })` instead.
- **Legacy URLs.** `http(s)` `blobPath` values are redirected to as-is, so they are public and never expire. Migrate them into the private bucket.

---

### H4 — No HTTP security headers **[High]**

Neither `next.config.ts` sets `headers()`, so there is no protection against:
- **Clickjacking** of the admin app. Frame it, and a victim's clicks land on "change role" or "delete".
- **Token leakage via Referer.** `/join/<token>` pages and Supabase recovery links carry secrets in the URL.
- **XSS impact.** `@supabase/ssr` session cookies are readable from JavaScript (`httpOnly: false` by design), so any XSS means session theft. A CSP is the main mitigation.

**Fix (both apps):** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: DENY` plus `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (use `no-referrer` on `/join/*` and `/reset-password`), `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")`, and `Cross-Origin-Opener-Policy: same-origin` (check that the Razorpay popup still works).

Add a nonce-based **CSP** generated in `proxy.ts`. Web needs these sources:
- `script-src`: self, nonce, `https://checkout.razorpay.com`
- `frame-src`: `https://api.razorpay.com https://checkout.razorpay.com`
- `connect-src`: the Supabase URL, `https://lumberjack.razorpay.com`
- `img-src`: self, the Supabase URL, `*.public.blob.vercel-storage.com`, `data:`

Admin needs `connect-src` for both Supabase projects plus the storage upload URL. Start with `Content-Security-Policy-Report-Only` for one week, then enforce. Also add `X-Robots-Tag: noindex` on the admin app, on top of the existing `robots` metadata.

---

### H5 — Staff account strength **[High]**

- No MFA. One phished Owner password means full control, including creating new Owners.
- Minimum password length is **6** on the admin reset and change forms (`reset-password/page.tsx:57`, `account-client.tsx:179`) and on the web sign-in. Only `/join` uses 8.
- The admin sign-in page offers **Google OAuth** (`sign-in/page.tsx:46-54`). If Google is enabled on the admin auth project and "Allow new users to sign up" is still on, anyone with a Google account gets a READER row there. The middleware still blocks them, but the "no self-service identities" design is broken. **[verify live]**

**Fix:**
- Enable Supabase MFA (TOTP) on the admin project. Enforce `aal2` in `createAuthMiddleware` when `allowedRoles` is set: check `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` and redirect to an enrol/challenge page.
- Require at least 12 characters for staff and at least 8 for customers, and turn on Supabase **leaked-password protection** (HaveIBeenPwned).
- On the admin project, turn off "Allow new users to sign up" globally (this covers OAuth too). Either remove the Google button from the admin sign-in page, or keep Google only after staff are invited.
- Enable **Secure email change** (confirm on both addresses) and **Secure password change** (reauthentication nonce) in Auth settings, rather than the client-side `signInWithPassword` re-check in `account-client.tsx:192`.
- Shorten the admin JWT expiry (for example 15 minutes) and set an inactivity timeout. `deleteStaffAccount` doesn't revoke live sessions: add `auth.admin.signOut(userId, "global")` before deleting, and do the same on demotion.

---

### Medium

| ID | Finding | Location | Fix |
|----|---------|----------|-----|
| M1 | Webhook `timingSafeEqual` throws on length mismatch → 500 (and unhandled `JSON.parse`) | `packages/payments/src/index.ts:38,47` | Compare lengths first and return `false`. Wrap parse in try/catch and return 400. Fail closed if `RAZORPAY_WEBHOOK_SECRET` is unset. |
| M2 | No rate limiting anywhere | `startCheckout`, `/join/[token]`, `/api/books`, `/api/library`, wishlist/address actions, `/api/uploads*` | Use Vercel WAF rate-limit rules or `@upstash/ratelimit` in `proxy.ts`/actions, keyed by IP and user id. Also tighten Supabase Auth rate limits (sign-in, sign-up, OTP, recovery). |
| M3 | CMS links accept `javascript:`/`data:` schemes | `settings/navigation/schema.ts:7`, `content/banners/schema.ts:15,17`, `books/schema.ts:35-54` (`z.string().url()` accepts `javascript:`), `site/schema.ts` social URLs | Add a shared `safeHref` zod refinement (`/`-relative, `https:`, `mailto:`, `tel:` only). React 19 blocks `javascript:` in `href`, but don't rely on it. |
| M4 | Invite link built from `x-forwarded-host` when `NEXT_PUBLIC_ADMIN_URL` is unset | `apps/admin/lib/staff-invites.ts:31-39` | Require `NEXT_PUBLIC_ADMIN_URL` in production and drop the header fallback. |
| M5 | Raw Supabase/Resend error text shown to users | `join/[token]/actions.ts:40`, `settings/roles/actions.ts:75,147`, both sign-in pages | Map to generic messages. Log the detail server-side. Account-enumeration text ("User already registered") should become "Check your email". |
| M6 | E-book upload: `.pdf` name check only, and the signed upload URL accepts any bytes of any size | `apps/admin/app/api/uploads/ebook/route.ts:48-56` | Set the `ebooks` bucket's **allowed MIME types = application/pdf** and **file size limit = 100 MB** in Supabase. After upload, verify the `%PDF-` magic bytes server-side in `syncEbookFileAsset` before writing the `FileAsset`. Check that `ebookFilePath` matches the `<uuid>-<name>.pdf` pattern the route minted. |
| M7 | Malware scan is a stub that always returns `CLEAN`, and `uploadToStaging` uses `access: "public"` | `packages/jobs/src/functions/malwareScan.ts:9-13`, `packages/storage/src/index.ts:13` | Implement Cloudmersive/ClamAV **before** any customer upload feature (manuscripts, self-publishing) ships. Make staging `private`. Make `quarantine` move rather than delete. |
| M8 | Admin proxy matcher uses prefix lookahead, so `/joinX`, `/sign-inY` and similar skip auth | `apps/admin/proxy.ts:13` | Anchor it: `(?!(?:sign-in|forgot-password|reset-password|unauthorized|join)(?:/|$)|_next/static|_next/image|favicon.ico)`. Also add a `requireStaff()` guard in admin **pages** that render PII (orders, submissions, royalties) as defence in depth. The docs say proxy is not a security boundary, but those pages rely on it today. |
| M9 | Inngest endpoint must verify signatures | `apps/web/app/api/inngest/route.ts` | Make sure `INNGEST_SIGNING_KEY` is set in production (Inngest v3 then rejects unsigned calls) and that `INNGEST_DEV` is never set there. Add a startup assertion. |
| M10 | Secrets live where they aren't needed | `apps/admin/.env.example` lists `RAZORPAY_KEY_SECRET`, `INNGEST_*` (admin imports neither `@repo/payments` nor `@repo/jobs`). `apps/web` lists `DIRECT_URL` and `BLOB_READ_WRITE_TOKEN` (runtime unused today) | Remove them. Give each app its own Supabase **secret key** (the new `sb_secret_…` keys) so each can be rotated on its own, and delete the legacy `service_role` JWT once migrated. |
| M11 | Errors are silently swallowed, so attacks leave no trace | `apps/web/lib/safe-fetch.ts`, `getContent`/`getPricingConfig` | Keep the fallback UX, but log the error (Sentry). Remove the sample-data fallback in production for anything order- or account-related. |
| M12 | Known-vulnerable dependencies (4 high, 4 moderate) | `prisma` CLI → `@prisma/config` → `deepmerge-ts`, `mysql2`. `@react-email/components` → `prismjs` | Upgrade `prisma` to a release that drops the vulnerable versions, and `@react-email/components` to ≥1.0. These are mostly build- or CLI-time, but still worth fixing. |

### Low

- **L1** `getStaffByEmail` uses `.ilike("email", email)`, so `_` and `%` act as wildcards (`packages/auth/src/server.ts:125`). Use `.eq` on a lower-cased column.
- **L2** `acceptStaffInvite` isn't atomic, so two tabs can race. Use `updateMany({ where: { id, acceptedAt: null } })` **before** `createStaffAuthUser`, and roll back if that fails.
- **L3** Invite tokens are in the URL path and will show up in Vercel request logs. That's acceptable given the 1-hour, single-use TTL, but set `no-referrer` (H4) and avoid logging full paths for `/join/*`.
- **L4** Order-confirmation and status emails interpolate `bookTitle` and `orderId` into subjects. React Email escapes the body, but strip CR/LF from subject inputs.
- **L5** `AuditLog.diff` stores entire form payloads. That's fine today, but never let it capture passwords or tokens (the join action correctly logs neither). Add a lint rule or a test.
- **L6** `site-footer.tsx:90` already uses `rel="noopener noreferrer"`. Keep that for all `target="_blank"` links (the admin `app-shell.tsx:219` and `sidebar-nav.tsx:246` links should be checked for it).
- **L7** Add `server-only` imports to `packages/auth/src/server.ts`, `packages/storage/src/index.ts`, `packages/payments/src/index.ts`, and `packages/email/src/index.ts`, so the build fails if a Client Component ever imports a service-role path.

---

## 4. Roadmap

Phases are ordered by risk, not effort. Each task lists **Where** (code vs dashboard) and a **Done when** check you can run.

### Phase 0 — Stop the bleeding (this week, before any real customer data or payments)

**0.1 Lock down the storefront Data API (C1).** *Dashboard + migration.*
1. Add a Prisma migration `enable_rls_all_tables` that runs `alter table public.<t> enable row level security;` for **every** table. Keep only the existing self-read policies and add `addresses`/`wishlists`/`notifications` self-read ones if a client ever needs them (none do today).
2. `revoke all on all tables in schema public from anon, authenticated;` plus `alter default privileges in schema public revoke all on tables from anon, authenticated;` so future Prisma tables start locked.
3. Add Supabase's recommended **event trigger that auto-enables RLS** on `create table` in `public`.
4. Strongest option: nothing in `apps/web` uses PostgREST for business data (everything goes through Prisma, and Storage is a separate API). So remove `public` from **Settings → API → Exposed schemas** on the storefront project, or move Prisma tables into a non-exposed `app` schema.
5. Rotate the publishable key afterwards if you have any reason to think it was used.
- **Done when:** `curl "$SUPABASE_URL/rest/v1/addresses?select=*" -H "apikey: $PUBLISHABLE"` returns 401/404 or `[]` for every table, and the Security Advisor shows zero RLS findings. Script this as a test (see 3.3).

**0.2 Fix payment confirmation (C2) and harden the webhook (M1).** *Code: `apps/web/app/(checkout)/actions.ts`, `apps/web/app/api/webhooks/razorpay/route.ts`, `packages/payments/src/index.ts`, `schema.prisma` (`gatewayPaymentId @unique`).*
- **Done when:** a Vitest test that replays order A's signature against order B gets `BAD_SIGNATURE`/`NOT_FOUND`, and a webhook with a mismatched amount is ignored and logged.

**0.3 Checkout input and product eligibility (C3).** *Code: `startCheckout`.*
- **Done when:** checking out an unpublished product id, `quantity: NaN`, or `quantity: 1e9` is rejected with a typed error.

**0.4 Fail closed on admin auth config (H2) and invite origin (M4).** *Code: `packages/auth/src/env.ts`, `apps/admin/lib/staff-invites.ts`.*
- **Done when:** `next build`/start of `apps/admin` with `NODE_ENV=production` and no `NEXT_PUBLIC_AUTH_SUPABASE_URL` throws.

**0.5 Open-redirect fix (H1).** *Code: shared helper in `packages/auth`, both sign-in pages. Dashboard: exact redirect URL allowlist on both Supabase projects.*

**0.6 Supabase Auth hardening, admin project (H5, dashboard part).** Turn off new-user signups (email **and** OAuth), disable the Google provider unless it's needed, enable leaked-password protection, set minimum password length to 12, enable secure email and password change, and shorten JWT expiry.
- **Done when:** a new Google account can't create any row in the admin project's `auth.users`.

### Phase 1 — Harden the application (next 2–3 weeks)

**1.1 Security headers and CSP (H4).** `headers()` in both `next.config.ts` files, plus a nonce CSP in `proxy.ts` (run report-only first). Verify with securityheaders.com (aim for grade A) and check that Razorpay checkout still opens.

**1.2 Staff MFA (H5).** Add TOTP enrolment and challenge pages to `apps/admin`. Enforce `aal2` in `createAuthMiddleware({ allowedRoles, requireMfa: true })` **and** in a `requireStaff()` helper used by every Server Action (upgrade `assertRole` so it can't be called without a fresh staff lookup). Revoke sessions on role change and removal.

**1.3 E-book entitlement rework (H3).** Add a per-user `Entitlement` (or per-`OrderItem`) download counter, an edition-aware check, atomic increments, and a narrow query. Migrate legacy `http` `blobPath` rows into the private bucket.

**1.4 Uniform input validation.** Give every Server Action and Route Handler in `apps/web` a zod schema: addresses (`lib/actions/addresses.ts`), with length caps on every field and a phone regex; wishlist `productId` as a cuid; checkout (0.3). In `apps/admin`, add `.max()` lengths to every string schema (titles, descriptions, meta fields) to stop DB bloat and oversized payloads. Add the `safeHref` refinement (M3).

**1.5 Rate limiting (M2).** Put Vercel WAF rules on `/api/*` and `/sign-in`, and use Upstash-backed limits inside `startCheckout`, `acceptStaffInvite`, and the upload routes. Tune Supabase Auth rate limits.

**1.6 Upload pipeline (M6, M7).** Set bucket-level MIME and size limits on `ebooks` and `images`, add a server-side PDF magic-byte check, make staging private, and implement the real malware scan before self-publishing uploads launch.

**1.7 Error hygiene (M5, M11) and `server-only` guards (L7).** Map external errors to generic messages and log the detail. Add `import "server-only"` to secret-bearing packages.

**1.8 Admin page-level guards (M8).** Anchor the matcher and add `await requireStaff(ADMIN_ROLES)` at the top of admin pages that render customer data.

### Phase 2 — Platform, secrets, and supply chain (weeks 3–5)

**2.1 Secrets management (M10).**
- Store secrets per app and per environment in Vercel. Mark them **Sensitive**. Keep production-only secrets out of Preview.
- Move to Supabase's new publishable and secret API keys, with one secret key per app.
- Write a rotation runbook for the Razorpay key and webhook secret, Supabase keys, Resend, Inngest, and the DB password.
- Remove unused secrets from `apps/admin`.

**2.2 Database hygiene.**
- Use a dedicated least-privilege Postgres role for the runtime `DATABASE_URL` (no DDL, no `auth` schema access), and keep `postgres` for `DIRECT_URL` migrations only.
- Enforce SSL (`sslmode=require`), and enable Supabase **Network Restrictions** once you know Vercel's egress IPs (or use Vercel Secure Compute).
- Enable **PITR backups** and test a restore.

**2.3 CI security pipeline.** Add `.github/workflows/security.yml` with:
- `npm audit --omit=dev --audit-level=high`, failing on high
- CodeQL (javascript-typescript)
- `gitleaks` for secret scanning
- `eslint-plugin-security`
- typecheck
- Dependabot or Renovate for weekly updates, including Next.js security releases

Enable GitHub **secret scanning + push protection** and a **branch protection** rule on `main` that requires review and passing checks.

**2.4 Dependency upgrades (M12).** Upgrade `prisma`/`@prisma/config` and `@react-email/components`. Pin Next.js to the latest 16.x patch and subscribe to Vercel/Next security advisories.

**2.5 Deployment isolation.**
- Serve admin on its own subdomain (for example `admin.<domain>`).
- Enable Vercel **Deployment Protection** on admin previews and, optionally, on production (Vercel Authentication or password, or a Trusted IP allowlist if staff work from fixed locations).
- Make sure preview deployments use **test** Razorpay keys and a non-production Supabase project.

**2.6 Third-party scripts.** Razorpay's `checkout.js` loads from their CDN. You can't use SRI because it's versionless, so rely on the CSP allowlist, and load it only on the cart and checkout routes (already the case in `cart-screen.tsx:287`).

### Phase 3 — Detection, response, compliance (weeks 5–8, then ongoing)

**3.1 Logging and monitoring.**
- Sentry (or Vercel Observability) in both apps, with PII scrubbing (emails, addresses, tokens in URLs).
- Structured security events: failed sign-ins, `Forbidden` from `assertRole`, bad webhook signatures, `BAD_SIGNATURE` in checkout, download-limit hits, and rate-limit trips.
- Extend `AuditLog` to storefront security-relevant events (order status changes by webhook and confirm, entitlement downloads).
- Alerts for anomalies such as spikes in 403s, new OWNER role grants, or discount-code creation.

**3.2 Incident response plan.** Write a one-page runbook covering who is on call, how to rotate every key (link to 2.1), how to force-sign-out all sessions per Supabase project, and how to disable checkout (a feature flag). Include the reporting obligations:
- **CERT-In** requires reporting cyber incidents within **6 hours** and keeping ICT logs for **180 days** (CERT-In Directions, April 2022). Set Vercel/Supabase log drains and retention to match.
- **DPDP Act 2023**: breach notice to the Data Protection Board and to affected users.

**3.3 Security test suite.** Once Vitest and Playwright land (per the TDD), add:
- Unit tests for C2, C3, H1, H3, M1, and M3.
- An **RLS regression test** that hits every `public` table through PostgREST with the anon key and a customer JWT, expecting denial.
- An authorization matrix test: every admin Server Action is called as READER, SUPPORT, EDITOR, and OWNER and checked against `roles.ts`.
- A Playwright check that the admin can't be framed and that headers are present.

**3.4 Privacy and compliance (India).**
- **DPDP Act 2023**: a privacy notice, clear consent at sign-up and checkout, a documented purpose for each PII field, and self-service **account deletion and data export** for customers (currently missing).
- Retention rules: purge abandoned PENDING orders and expired `staff_invites`.
- Data-processing agreements with Supabase, Vercel, Resend, Razorpay, and Inngest.
- **PCI DSS**: card data never touches the servers (Razorpay Checkout), so scope stays minimal. Keep it that way: never log Razorpay payloads in full, and never add a custom card form.
- **GST invoices** carry PII too, so apply the same access rules when that feature lands.

**3.5 External validation.** Before public launch, run an OWASP ZAP baseline scan against staging, then a short **third-party penetration test** focused on checkout, the library, and the admin. Repeat yearly and after major features (the self-publishing uploads especially).

### Ongoing

- Review admin staff roles monthly (the Owner checks the Staff & roles list).
- Rotate keys quarterly and immediately whenever someone with access leaves.
- Before shipping any new feature, check it against: RLS on new tables, a zod schema on new actions, `assertRole`/`requireStaff` on mutations, rate limits on new public endpoints, and no new `NEXT_PUBLIC_` secret.
- Update `CLAUDE.md` files with these rules once Phase 0–1 land, so future work keeps to them.

---

## 5. What's already good (keep it)

- `assertRole()` at the top of every admin Server Action. The roles actions also prevent removing the last Owner or yourself.
- Prices are re-derived server-side in `startCheckout`, and client prices are never trusted.
- The webhook is the source of truth and is HMAC-verified. `timingSafeEqual` is used (it just needs the length guard).
- Staff invites use 32-byte random tokens, store only their SHA-256, are single-use, and expire after 1 hour.
- Image uploads use a MIME allowlist plus magic-byte sniffing, reject SVG, cap size, and use random object names.
- E-books sit in a private bucket and are served through 5-minute signed URLs.
- Admin uses a separate Supabase auth project, and `robots: noindex` is set.
- `getUser()` (server-validated JWT) is used everywhere instead of `getSession()`.
- Address and wishlist actions scope every query by `user.id`, so no IDOR was found there.
- `.env*` files are gitignored, and no env file appears anywhere in git history.
