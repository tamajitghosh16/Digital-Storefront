# Production Launch Guide — Digital Storefront

_Written 2026-10-27 from the repo as of commit `91e7e05`. Work through the
phases in order; each one assumes the ones before it are done. Items marked
**[code]** are things the code base still needs, everything else is setup in
a dashboard or a terminal._

The target shape:

```
                    ┌──────────────────────────────┐
  customers ──────► │ Vercel project "web"         │──► Razorpay (live)
  www.<domain>      │ Root Directory = apps/web    │──► Resend, Upstash
                    └──────────────┬───────────────┘
                                   │ Prisma (pooled, app_runtime role)
                    ┌──────────────▼───────────────┐
                    │ Supabase "storefront" (prod) │  Postgres + customer Auth
                    │ Storage: images (public),    │  + Storage buckets
                    │          ebooks (private)    │
                    └──────────────▲───────────────┘
                                   │ Prisma (same DB)
                    ┌──────────────┴───────────────┐
  staff ──────────► │ Vercel project "admin"       │──► Resend (staff invites)
  admin.<domain>    │ Root Directory = apps/admin  │
                    └──────────────┬───────────────┘
                                   │ Auth only
                    ┌──────────────▼───────────────┐
                    │ Supabase "admin-auth" (prod) │  staff identities only
                    └──────────────────────────────┘
```

---

## Phase 0 — Is development actually "complete"?

Don't start Phase 1 until each of these is either done or deliberately cut
from launch scope. Source: README.md "What's real vs. what's a stub" and
`docs/security-roadmap.md` §0.

**Features [code]**
- [ ] Add-to-cart Server Action and server-side cart persistence on login.
- [ ] Refund flow (at minimum a staff action that refunds through Razorpay and
      revokes e-book access; `apps/web/lib/library.ts` already drops access on
      refunded orders).
- [ ] Self-publishing wizard + customer upload → malware scan → promote
      pipeline — **or** hide the Self Publishing / Bulk Publishing upload paths
      for launch and take enquiries by email instead.
- [ ] The four product-line pages and two service pages that are still
      `EmptyState`/`DummyPage` stubs — build them or remove them from the nav.
- [ ] Review moderation (or hide reviews for launch).

**Pages the law and Razorpay require** — built: `/privacy-policy`, `/terms`,
`/refund-policy`, `/shipping-policy`, `/contact`, linked from the footer's
"Policies" column. Before launch:
- [ ] Fill in admin → *Homepage text* → "Policies and contact page": registered
      business name, GSTIN, Grievance Officer name + email, courts with
      jurisdiction (the pages fall back to neutral wording while these are blank).
- [ ] Check Site Settings' contact email, phone and address are the real ones.
- [ ] Have a lawyer or CA review the wording of all five pages against how the
      business actually operates (return window, dispatch time, refunds).

**SEO basics** — built: `app/sitemap.ts` (static pages + every published
product, hourly) and `app/robots.ts` (blocks everything outside Vercel
Production). Set `NEXT_PUBLIC_STOREFRONT_URL` on the web project so their URLs
use the canonical domain.

**Quality gate**
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all
      pass from a clean clone.
- [ ] At least smoke tests for checkout and admin authorization (the roadmap
      lists these as not done; Playwright is the planned tool).
- [ ] The `security` GitHub workflow is green on `main`.

---

## Phase 1 — Accounts and plans

Create these under a **business** email you'll keep (not a personal one), and
turn on 2FA for every one of them.

| Service | Plan for production | Why not free |
|---|---|---|
| **Vercel** | Pro (one team, two projects) | Hobby forbids commercial use. |
| **Supabase** × 2 | Pro for **storefront**; admin-auth can stay Free | Free projects pause after a week of inactivity and have no daily backups. A paused storefront DB = site down. |
| **Razorpay** | Standard (KYC) | Live keys need business KYC + website review (allow 2–7 working days). |
| **Resend** | Free tier is fine to start | Needs your domain verified. |
| **Upstash Redis** | Free/pay-as-you-go | Without it rate limits are per-instance only. |
| **Cloudmersive** | Only if customer uploads ship at launch | Without the key uploads stay `PENDING` forever (fails closed). |
| **Domain registrar** | — | e.g. `<domain>` with `www.` and `admin.` subdomains. |

Pick one region and stay in it: Supabase **ap-south-1 (Mumbai)**, Upstash
**Mumbai**, Vercel function region **bom1**. Cross-region DB round trips are
the easiest performance mistake to make here.

**Staging vs production.** Keep your current Supabase projects as
**staging** and create **two new production projects** (storefront +
admin-auth). Vercel Preview deployments point at staging + Razorpay test
keys; only the Production environment gets the production DB and live keys.

---

## Phase 2 — Production database (storefront Supabase project)

1. **Create the project** (Mumbai, strong DB password saved in a password manager).
2. **Point the Prisma CLI at it.** Make a *separate* copy of
   `packages/database/.env` (e.g. keep your staging one as `.env.staging`) and
   fill `DATABASE_URL` / `DIRECT_URL` from Project Settings → Database. Double
   check the project ref in the URL before every command below.
3. **Apply migrations:**
   ```bash
   npm run migrate:deploy --workspace=@repo/database
   ```
   Never run `db:migrate` (`migrate dev`) against production — it can reset data.
4. **Run the SQL files** in the storefront project's SQL editor, in this order:
   1. `packages/database/prisma/sql/sync_user.sql` — `auth.users` → `public.users` trigger.
   2. `packages/database/prisma/sql/auto_enable_rls.sql` — RLS on any future table.
   3. `packages/database/prisma/sql/app_runtime_role.sql` — least-privilege
      `app_runtime` login. Set its password, then build the runtime
      `DATABASE_URL` for **both** Vercel projects from it (pooled port 6543,
      `?pgbouncer=true`). `postgres` stays for migrations only.
5. **Seed CMS defaults:**
   ```bash
   npm run seed --workspace=@repo/database
   ```
6. **Verify the Data API is locked:**
   ```bash
   npm run check:data-api --workspace=@repo/database
   ```
   Every table must report `blocked`. Optionally remove `public` from
   Settings → API → Exposed schemas — nothing uses it.
7. **Storage buckets:** create `images` (**public**) and `ebooks`
   (**private**), then:
   ```bash
   npm run harden-buckets --workspace=@repo/storage
   ```
8. **Backups:** on Pro, confirm daily backups are on; consider the PITR add-on
   once orders flow (it's the only way to undo a bad migration to the minute).

---

## Phase 3 — Admin auth project (staff identities)

Run the wizard against the **new production** admin-auth project:

```bash
bash docs/setup/admin-auth-project.sh
```

It walks you through `sync_staff.sql`, creating the Owner, and
`update public.users set role = 'OWNER' where email = '…';`. Then, in that
project's **Authentication** settings:

- [ ] Turn **off** "Allow new users to sign up" (also blocks OAuth sign-ups).
- [ ] If Google sign-in is offered on the admin sign-in page, either configure
      Google OAuth for this project or disable the provider.
- [ ] Minimum password length 12, leaked-password protection on.
- [ ] Secure email change + secure password change on.
- [ ] JWT expiry shortened (e.g. 900 s).
- [ ] URL Configuration → Site URL `https://admin.<domain>`, Redirect URLs
      exactly `https://admin.<domain>/**` (no wildcards on other hosts).

Staff 2FA was removed on 2026-09-27 and is an accepted risk for now — make
sure the Owner account at least uses a long unique password.

---

## Phase 4 — Storefront auth (customer identities)

In the **storefront** project → Authentication:

- [ ] **Custom SMTP (mandatory).** Supabase's built-in mailer only delivers to
      your own team's addresses and is heavily rate-limited, so real customers
      would never receive sign-up confirmation or password-reset emails.
      Use Resend's SMTP (`smtp.resend.com`, port 465, user `resend`, password =
      a Resend API key) with a From address on your verified domain.
- [ ] Customise the email templates (confirm sign-up, reset password, magic
      link) with the Press's name.
- [ ] Email confirmation on; minimum password length 8; leaked-password protection on.
- [ ] Site URL `https://www.<domain>`; Redirect URLs exactly
      `https://www.<domain>/**` (plus the apex if you serve it).
- [ ] Review Auth rate limits.
- [ ] Any OAuth providers (Google etc.): create **production** OAuth clients
      with the production callback URL.

---

## Phase 5 — Third-party services

**Resend (email)**
1. Add and verify `<domain>` — add the SPF, DKIM (and MX for bounces) records
   it gives you at your registrar. Add a DMARC record
   (`v=DMARC1; p=none; rua=mailto:…`) to start; tighten to `quarantine` later.
2. Create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM`, e.g.
   `"New School Book Press <orders@<domain>>"`.

**Razorpay (payments)**
1. Complete KYC and website activation (needs the Phase 0 policy pages to be
   live — you can submit with the staging URL if it's publicly reachable).
2. Generate **live** keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same value as the key id).
3. Settings → Webhooks → Add: URL `https://www.<domain>/api/webhooks/razorpay`,
   event **`payment.captured`** (the only one the route acts on), a strong
   secret → `RAZORPAY_WEBHOOK_SECRET`. The app refuses to boot in production
   without it.
4. Confirm payments are set to **auto-capture**, since orders are only marked
   paid on `payment.captured`.
5. Keep a **separate test-mode webhook** pointing at staging.

**Upstash Redis (rate limiting)**
- Create one Redis DB in Mumbai → `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`; use the same values on both apps.

**Cloudmersive** — only if customer uploads ship: API key →
`CLOUDMERSIVE_API_KEY` on web.

**Shared secret** — generate once and use on both apps:
```bash
openssl rand -hex 32
```
→ `STOREFRONT_REVALIDATE_SECRET`.

---

## Phase 6 — Vercel projects

Create **two** projects from the same GitHub repo.

| Setting | web | admin |
|---|---|---|
| Root Directory | `apps/web` | `apps/admin` |
| Framework | Next.js | Next.js |
| Install / Build | defaults (Vercel installs npm workspaces from the repo root) | defaults |
| "Include files outside Root Directory" | On | On |
| Function region | `bom1` (Mumbai) | `bom1` |
| Node.js version | match your local LTS | same |
| Ignored Build Step (optional) | `npx turbo-ignore` | `npx turbo-ignore` |
| Deployment Protection | Standard | **On for previews**, and consider Vercel password/SSO protection for production too |

**Environment variables.** Copy each app's own `.env.example` list (they are
deliberately different). Scope every value to **Production** or **Preview**
separately, and tick **Sensitive** on every secret.

| Variable | web | admin | Production value |
|---|---|---|---|
| `DATABASE_URL` | ✓ | ✓ | prod pooled URL, `app_runtime` role |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` | ✓ | ✓ | storefront prod project |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | storefront prod project |
| `NEXT_PUBLIC_AUTH_SUPABASE_URL` / `_PUBLISHABLE_KEY` | — | ✓ | admin-auth prod project |
| `AUTH_SUPABASE_SERVICE_ROLE_KEY` | — | ✓ | admin-auth prod project |
| `RAZORPAY_KEY_ID` / `_SECRET` / `_WEBHOOK_SECRET` | ✓ | — | **live** (Preview: **test**) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✓ | — | live key id |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✓ | ✓ | |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | ✓ | ✓ | |
| `STOREFRONT_REVALIDATE_SECRET` | ✓ | ✓ | same value both |
| `NEXT_PUBLIC_STOREFRONT_URL` | ✓ | ✓ | `https://www.<domain>` (web: sitemap/robots URLs) |
| `NEXT_PUBLIC_ADMIN_URL` | — | ✓ | `https://admin.<domain>` (required in prod) |
| `CLOUDMERSIVE_API_KEY` | ✓ if uploads | — | |
| `BLOB_READ_WRITE_TOKEN` | only if the Blob staging path is used | — | |
| `CSP_REPORT_ONLY` | leave **unset** | leave **unset** | only `true` as an emergency escape hatch |

Both apps' `instrumentation.ts` refuse to boot in production if a secret
lands in a `NEXT_PUBLIC_*` variable or a required one is missing — a failed
boot after deploy is almost always a missing/misnamed env var. Check the
deployment's Runtime Logs first.

---

## Phase 7 — Domains and DNS

1. Vercel web project → Domains: add `<domain>` and `www.<domain>`; make one
   canonical and redirect the other to it.
2. Vercel admin project → Domains: add `admin.<domain>`.
3. At the registrar, add the A/CNAME records Vercel shows. TLS certificates
   are issued automatically.
4. Once HTTPS works on every host, the HSTS header the apps already send in
   production takes effect — don't point these hosts back at plain HTTP after this.
5. Re-check that every URL used so far (Supabase Site/Redirect URLs, Razorpay
   webhook, `NEXT_PUBLIC_*_URL`) uses the final hostnames, then **redeploy
   both projects** so the `NEXT_PUBLIC_*` values are baked into the build.

---

## Phase 8 — Rehearsal on staging, then on production

Do the full list on **staging (Razorpay test mode)** first, then the short
list on production.

**Storefront**
- [ ] Sign up a new customer → confirmation email arrives (from your domain,
      not spam) → sign in → reset password works.
- [ ] Browse catalogue, add paperback/hardcover/e-book lines, apply a discount
      code, checkout with Razorpay → order shows **Paid** only after the
      webhook (check Razorpay → Webhooks → delivery log shows 200).
- [ ] E-book appears in My Library and downloads; the signed URL expires.
- [ ] COD order path (if offered) creates an unpaid order correctly.
- [ ] Order-confirmation email arrives (Resend → Emails shows it sent).
- [ ] Policy pages are linked from the footer.

**Admin**
- [ ] Owner signs in at `admin.<domain>`; a random Google/email account cannot.
- [ ] Owner invites a staff member → invite email → `/join/<token>` works →
      role is correct.
- [ ] Create a book with cover upload + e-book PDF, publish → appears on the
      storefront within seconds (revalidate secret working).
- [ ] Edit site settings / homepage copy → storefront updates.

**Security and quality**
- [ ] `npm run check:data-api --workspace=@repo/database` → all `blocked`.
- [ ] Headers: run `https://www.<domain>` and `https://admin.<domain>` through
      securityheaders.com (expect CSP, HSTS, frame, referrer headers).
- [ ] Browser console on key pages shows no CSP violations.
- [ ] OWASP ZAP baseline scan against staging (roadmap §3.5).
- [ ] Lighthouse: performance, accessibility and SEO on home, catalogue, book
      page, checkout (mobile profile).

**Production smoke test (go-live day)**
- [ ] One real low-value purchase with a real card/UPI → order paid →
      e-book delivered → **refund it** from the Razorpay dashboard.
- [ ] Sign up with a real address; sign in to admin.

---

## Phase 9 — Go live

1. Freeze `main`; tag the release (`git tag v1.0.0 && git push --tags`).
2. Apply any pending migrations to production **before** promoting code that
   needs them (Phase 2 step 3).
3. Confirm the Vercel Production deployments of both apps are on that commit.
4. Run the production smoke test above.
5. Submit `https://www.<domain>/sitemap.xml` in Google Search Console and
   Bing Webmaster Tools; verify domain ownership via DNS TXT.
6. Announce.

**Rollback:** Vercel → Deployments → previous deployment → "Instant
Rollback" (seconds). Database migrations are **not** rolled back by this —
which is why migrations should be additive (add columns/tables first, remove
old ones in a later release).

---

## Phase 10 — After launch

**Monitoring (set up in the first week)**
- [ ] Error tracking — Sentry for both apps (roadmap M11, not done yet) [code].
- [ ] Uptime check on `https://www.<domain>` and `/api/webhooks/razorpay`
      health (e.g. Better Stack / UptimeRobot), alerting to phone/email.
- [ ] Vercel log drain or at least Vercel's Observability tab; keep security
      logs 180 days (roadmap).
- [ ] Razorpay webhook failure email alerts on.
- [ ] Supabase: usage alerts, and watch DB size / connection count.

**GitHub**
- [ ] Protect `main`: require PRs and the `security` workflow to pass.
- [ ] Enable secret scanning, push protection, Dependabot security updates.

**Ongoing release process**
1. Branch → PR → Vercel Preview (staging DB, Razorpay test keys) → review.
2. If the PR has a migration: `migrate:deploy` to staging, test, then to production.
3. Merge to `main` → Vercel deploys both apps to production automatically.
4. Quick smoke test; Instant Rollback if anything is off.

**Open items carried from the security roadmap**
- Staff TOTP 2FA (deferred by decision).
- DPDP self-service: account deletion and data export.
- Prisma 8 / `@react-email/components` 1.x upgrades (M12).
- Per-app Supabase secret keys (M10).
- Third-party penetration test, then yearly and after big features
  (especially customer uploads).
- Incident handling: `docs/security-incident-response.md`.
