# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `apps/web` — the public storefront and customer account area. See
the root `CLAUDE.md` for monorepo-wide commands and shared-package
architecture (auth, database, payments, jobs).

## Commands

Run from `apps/web`, or via `npm run <script> --workspace=web` from the repo root.

```bash
npm run dev          # next dev --turbopack, port 3000
npm run build
npm run lint
npm run typecheck
```

## Architecture

**Audience: Guests, Readers, and Self-Publishing Authors.** Unlike
`apps/admin`, this app is intentionally mostly public — `middleware.ts`
only guards `/account/**` and `/self-publishing/wizard/**` (see its
`matcher`), and applies no role restriction beyond "signed in." Role-
specific areas (like the publishing dashboard) enforce their own check in
the page/layout itself.

**Route groups map directly to BRD modules:**
- `app/(storefront)/` — public catalogue, product/service detail pages, the self-publishing landing page. No auth required.
- `app/(account)/` — `layout.tsx` calls `getCurrentUser()` and redirects to `/sign-in` if absent (defense-in-depth behind middleware). `account/publishing/page.tsx` additionally requires `role === "SELF_PUB_AUTHOR"`.
- `app/(checkout)/` — cart (client-rendered, Zustand) and checkout.
- `app/api/` — the three Route Handlers that need a stable HTTP contract: `webhooks/razorpay` (payment source of truth), `inngest` (serves `packages/jobs` functions), `library/[assetId]` (entitlement-checked digital delivery).

**Cart state lives in `lib/cart-store.ts`** — a Zustand store persisted to
`localStorage`, not yet synced to the database on login/checkout (see root
README's stub list).

**Header, footer, homepage sections, and site-wide `<head>` metadata are
admin-controlled, not hardcoded.** `app/layout.tsx`'s `generateMetadata`
and `components/site-header.tsx`/`components/site-footer.tsx` read the
singleton `SiteSettings` row (via `@repo/database`'s `getSiteSettings()`)
and `NavLink` rows; `app/page.tsx` additionally reads `Banner`,
`Testimonial`, and `Faq` rows. All of these are edited from `apps/admin`
(`settings/site`, `settings/navigation`, `content/banners`,
`content/faqs`, `content/testimonials`) — there's no API call to admin,
just the same shared-Postgres read pattern already used for `Product`.
Per-product SEO metadata (`Product.metaTitle`/`metaDescription`/`ogImageUrl`,
editable from the admin catalogue form) is rendered via `generateMetadata`
on each of `books/[slug]`, `ebooks/[slug]`, and `services/[slug]`.

**`app/api/library/[assetId]/route.ts`** checks purchase entitlement and
the per-asset download-count limit before serving a file, but currently
redirects to the asset's public Blob path rather than minting a signed,
expiring URL — that's a known stub, not the intended final behavior (FR-9.1/9.2 in the BRD).
