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
(homepage hero/promo), `content/homepage` (every other heading and
description on the homepage), `content/faqs`, `content/testimonials`,
`settings/pricing` (delivery, bundle, GST, class-set tiers, discount
codes), and the `api/uploads` Route Handler behind the image fields.

**Admin is a full CMS for `apps/web`'s content, not just the product
catalogue.** `catalogue`, `settings/site`, `settings/navigation`,
`settings/pricing`, `content/banners`, `content/homepage`, `content/faqs`,
and `content/testimonials` all have real create/update (and, for the
CMS-only ones, delete) Server Actions — each validates with Zod, calls
`assertRole()` (`CATALOGUE_WRITE_ROLES` for catalogue and pricing,
`CONTENT_WRITE_ROLES` for the rest, both `EDITOR`/`OWNER` today), writes an
`AuditLog` row, and `revalidatePath()`s its own list page. There's no
cross-app cache to invalidate: `apps/web` reads these models with plain
Prisma calls and no fetch cache/ISR, so it picks up changes on the next
request automatically.

**Homepage copy is a registry, not a table of columns.**
`content/homepage` renders its fields from `CONTENT_GROUPS` in
`packages/database/src/content.ts`, which holds every editable string's
key, plain-English label, help text and *default copy*. `ContentBlock`
rows store only overrides, and the save action **deletes** a row whose
value matches the default — that's what makes "clear the box to restore
the original wording" work, and what lets a copy change in a later release
reach anyone who never overrode that field. Adding a new editable string
is a one-line change to that registry: the admin form and `getContent()`
both pick it up with no migration.

**Every form is written for a non-technical operator.** The shared kit is
`components/ui.tsx` (page furniture, labelled fields, tables, empty
states), `components/form-controls.tsx` (`useFormStatus` submit buttons,
confirm-before-delete), `components/image-field.tsx` (file picker →
`/api/uploads` → preview, with paste-a-URL as the escape hatch) and
`components/sidebar-nav.tsx`. Three rules the kit encodes: labels in
ordinary English with help text under anything non-obvious; long forms
split into titled sections; colour from the shared tokens in
`packages/config/tailwind-preset.css`, never raw Tailwind greys.
`catalogue/product-form.tsx` is a Client Component *because* of this — the
product type is picked first and only the fields that apply to it render,
and the web address is generated from the title.

**Image uploads skip the malware-scan pipeline on purpose.**
`api/uploads/route.ts` checks the caller's role, caps size at 4 MB (under
Vercel's 4.5 MB request-body limit), and verifies the file's *magic bytes*
rather than trusting `file.type`. It refuses SVG, which can carry script
and isn't sanitised anywhere — an SVG logo has to be pointed at by URL. It
calls `uploadImage()` in `packages/storage`, which writes straight to a
public `images/` path instead of going through
`uploadToStaging`/`promoteFromStaging`: that pipeline exists for untrusted
customer manuscripts, and the scan behind it is still a stub that always
returns `"CLEAN"`.

**Still read-only stubs:** `orders`, `submissions`, `royalties`, `reviews`,
`analytics`, `settings/roles` — these still do a direct read-only Prisma
query with no create/update forms or status-change actions wired up yet
(see the root README's "What's real vs. what's a stub" list).
