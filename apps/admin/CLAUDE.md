# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `apps/admin` — the internal back office. See the root
`CLAUDE.md` for monorepo-wide commands and shared-package architecture
(auth, database, payments, jobs).

## Commands

Run from `apps/admin`, or via `npm run <script> --workspace=admin` from the repo root.

```bash
npm run dev          # next dev --turbopack, port 3001
npm run build
npm run lint
npm run typecheck
```

## Architecture

**Audience: Publisher (Owner) and Staff only — the whole app is gated.**
Unlike `apps/web`, `middleware.ts` here locks every route to
`ADMIN_ROLES` (`SUPPORT`, `EDITOR`, `OWNER` — from `packages/auth/src/roles.ts`)
by default; the `matcher` excludes only `/sign-in`, `/unauthorized`, and
static assets. There's no "public" area in this app.

**Owner-only pages are not further restricted by middleware.**
`app/settings/roles/page.tsx`, for example, is reachable by any admin role
at the middleware layer — it's expected to call `assertRole(role,
OWNER_ONLY_ROLES)` inside its Server Actions once those are implemented.
Don't assume a page under this app is Owner-only just because it looks
sensitive; check for an explicit `assertRole` call.

**Route map (all under `app/`):** `catalogue` (product/inventory CMS, with
`catalogue/new` and `catalogue/[id]` create/edit forms), `orders`,
`submissions` (self-publishing + service-request queues in one view),
`royalties`, `reviews` (moderation queue), `analytics`, `settings/roles`,
plus the storefront-CMS routes: `settings/site` (site branding/SEO/contact
defaults), `settings/navigation` (header/footer links), `content/banners`
(homepage hero/promo), `content/faqs`, `content/testimonials`.

**Admin is a full CMS for `apps/web`'s content, not just the product
catalogue.** `catalogue`, `settings/site`, `settings/navigation`,
`content/banners`, `content/faqs`, and `content/testimonials` all have real
create/update (and, for the CMS-only ones, delete) Server Actions — each
validates with Zod, calls `assertRole()` (`CATALOGUE_WRITE_ROLES` for
catalogue, `CONTENT_WRITE_ROLES` for the rest, both `EDITOR`/`OWNER`
today), writes an `AuditLog` row, and `revalidatePath()`s its own list
page. There's no cross-app cache to invalidate: `apps/web` reads these
models with plain Prisma calls and no fetch cache/ISR, so it picks up
changes on the next request automatically.

**Still read-only stubs:** `orders`, `submissions`, `royalties`, `reviews`,
`analytics`, `settings/roles` — these still do a direct read-only Prisma
query with no create/update forms or status-change actions wired up yet
(see the root README's "What's real vs. what's a stub" list).
