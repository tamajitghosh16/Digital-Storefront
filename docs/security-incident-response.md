# Security Incident Response — Runbook

One page to follow when something looks wrong. Keep it next to the on-call
phone. Companion to [security-roadmap.md](security-roadmap.md).

## 0. Who

| Role | Person | Contact |
|------|--------|---------|
| Incident lead (decides, communicates) | _Publisher / Owner — fill in_ | |
| Technical responder | _Developer — fill in_ | |
| Backup | _fill in_ | |

## 1. Recognise

Signals that start this runbook:
- Security events in the logs (JSON lines with `"security": true`):
  `checkout.payment_mismatch`, `webhook.amount_mismatch`,
  `webhook.bad_signature` (in bursts), `auth.forbidden` spikes,
  `malware.detected`, `rate_limit.exceeded` spikes, `auth.misconfigured`.
- `npm run check:data-api --workspace=@repo/database` reports a table as `EXPOSED`.
- An unexpected new OWNER/EDITOR in **Staff & roles**, or `staff.role_changed`
  rows in `audit_logs` nobody remembers making.
- Orders marked PAID with no matching captured payment in the Razorpay dashboard.
- A customer reports someone else's data, or a leaked discount code.
- A secret was committed, pasted in chat, or a laptop with `.env.local` files was lost.

## 2. Contain (first 30 minutes)

Do whichever apply — speed beats perfection here.

| Situation | Action |
|-----------|--------|
| Staff account compromised | Owner: **Staff & roles → Remove** the account (deletes the identity; `getUser()` fails on its next request). Then in the admin Supabase project: Authentication → Users → confirm gone. Reset the Owner's own password if in doubt. |
| All staff sessions suspect | Admin Supabase project → Settings → JWT → **rotate the JWT secret / signing key** (signs everyone out), then rotate `AUTH_SUPABASE_SERVICE_ROLE_KEY`. |
| Customer sessions suspect | Same, on the storefront project (signs every customer out). |
| A secret leaked | Rotate it now (table below), redeploy both apps, then look for use in the provider's logs. |
| Payments being abused | Unset `RAZORPAY_KEY_ID` in the web app's Vercel env and redeploy — checkout returns "payments aren't switched on" while everything else keeps working. |
| Data API exposure | Supabase storefront project → Settings → API → remove `public` from **Exposed schemas**; then run the `lock_down_data_api` migration if it isn't applied. |
| Malicious file uploaded | Delete the object in Supabase Storage (`ebooks`/`images`) and its `file_assets` row; the library stops serving it immediately. |
| Site under request flood | Vercel → Firewall: enable Attack Challenge Mode; add a rate-limit rule on `/api/*`. |

### Key rotation

| Secret | Where to rotate | Update in |
|--------|-----------------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Storefront Supabase → Settings → API keys | web + admin (Vercel) |
| `AUTH_SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase → Settings → API keys | admin |
| DB password (`DATABASE_URL`/`DIRECT_URL`) | Storefront Supabase → Settings → Database | web + admin + `packages/database/.env` |
| `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → API Keys / Webhooks | web |
| `RESEND_API_KEY` | Resend → API Keys | web + admin |
| `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` | Inngest → Manage → Keys | web |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console | web + admin |
| `CLOUDMERSIVE_API_KEY` | Cloudmersive portal | web |

## 3. Investigate

- `audit_logs` (every staff mutation, with `actorEmail`) — `select * from audit_logs order by "createdAt" desc limit 200;`
- Vercel → Logs (filter `"security":true`), Supabase → Logs (Auth, API, Postgres), Razorpay → Payments/Webhooks.
- Preserve evidence before cleaning up: export the relevant log ranges and table rows.

## 4. Notify (India)

- **CERT-In**: report cyber-security incidents within **6 hours** of noticing
  them (CERT-In Directions, 28 April 2022) — incident@cert-in.org.in /
  https://www.cert-in.org.in. ICT logs must be retained for **180 days**
  (configure a Vercel log drain + Supabase log retention accordingly).
- **DPDP Act 2023**: a personal-data breach must be reported to the Data
  Protection Board and to each affected person, in the form and time the
  DPDP Rules prescribe.
- **Razorpay**: report suspected payment fraud through the dashboard/support.
- Customers: plain-language notice of what happened, what data, what we did,
  what they should do (e.g. reset password).

## 5. Recover and learn

- Redeploy from a known-good commit; re-run `npm run check:data-api --workspace=@repo/database`.
- Write a short post-incident note (timeline, root cause, fix, follow-ups) in
  `docs/` and add any new check to CI so it can't recur silently.
