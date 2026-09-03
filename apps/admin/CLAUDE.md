# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `apps/admin` — the internal back office. See the root
`CLAUDE.md` for monorepo-wide commands and shared-package architecture
(auth, database, payments, jobs).

## Product principles

Two constraints shape every decision in this app, and both outrank
"what's fastest to build":

1. **The audience is the Owner (Shashibhushan, as Publisher/Super Admin)
   plus a small number of trusted employees the Owner personally grants
   access to** — never the general public, and never self-service signup.
   `ADMIN_ROLES` (`SUPPORT`, `EDITOR`, `OWNER`) exists to mirror how a
   small publishing business actually delegates: Support looks at orders
   and helps customers, Editor adds books and edits the website, only the
   Owner can touch royalty rates or say who else gets in. See "Staff
   access is Owner-granted" below for how that access is meant to be
   handed out.
2. **Every screen has to be operable by someone with no technical
   background.** No jargon, no raw IDs or enum values in copy, no forms
   that assume the operator knows what a slug or a webhook is. This is
   why the catalogue/CMS forms pick a product type first and only show
   the fields that apply, generate the web address from the title instead
   of asking for one, and use a file picker with a live preview instead
   of a URL field — see "Every form is written for a non-technical
   operator" below for the shared components that encode this.

New admin features should be designed against both of these before
implementation, not just wired up to satisfy a functional requirement.

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
Unlike `apps/web`, `proxy.ts` here locks every route to
`ADMIN_ROLES` (`SUPPORT`, `EDITOR`, `OWNER` — from `packages/auth/src/roles.ts`)
by default; the `matcher` excludes only `/sign-in`, `/unauthorized`, and
static assets. There's no "public" area in this app.

**This app authenticates against its own Supabase project, not the
storefront's** (`NEXT_PUBLIC_AUTH_SUPABASE_*` — see the root `CLAUDE.md` auth
section and `packages/auth/src/env.ts`). A storefront customer identity
cannot sign in here; there is no sign-up path and email sign-ups are
disabled on the project itself. Only auth moves: `DATABASE_URL` is still the
shared storefront Postgres, and `NEXT_PUBLIC_SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` still target the storefront project for
`packages/storage` image uploads. Because the staff UID has no row in the
storefront DB, staff role/profile is read over Supabase REST via
`getCurrentStaff()` (`packages/auth/src/server.ts`), not Prisma — use that,
never `getCurrentUser()`, in this app. Setup: `docs/setup/admin-auth-project.sh`
+ `packages/database/prisma/sql/sync_staff.sql`.

**Owner-only pages are not further restricted by middleware.**
`app/settings/roles/page.tsx`, for example, is reachable by any admin role
at the middleware layer — Owner-only-ness comes entirely from an explicit
`assertRole(role, OWNER_ONLY_ROLES)` inside its Server Actions. Don't
assume a page under this app is Owner-only just because it looks
sensitive; check for an explicit `assertRole` call.

**Staff access is Owner-granted, not self-service — now built.** There's no
public sign-up path into staff roles; every account exists because the Owner
invited it. `app/settings/roles` is the UI:

- **Add new Staff** (`inviteStaff` in `app/settings/roles/actions.ts`,
  `OWNER_ONLY_ROLES`): Owner enters a name + email; a `StaffInvite` row
  (`packages/database`, storefront DB) is created with a SHA-256 of a random
  token and a 1-hour `expiresAt`, and `@repo/email`'s `sendStaffInvite()`
  emails the `/join/<token>` link.
- **`/join/[token]`** (`app/join/[token]`, excluded from `proxy.ts`'s auth
  matcher and from the app-shell chrome): the only route the sign-up form
  lives at — no `/sign-up` exists. Validates the token hash + expiry + unused
  flag, then `acceptStaffInvite` creates the auth identity in the admin auth
  project via `createStaffAuthUser()` (`packages/auth/src/server.ts`), burns
  the invite, and redirects to `/sign-in`. New accounts land as `READER`.
- **Role change** (`changeStaffRole`, `OWNER_ONLY_ROLES`): the per-row
  dropdown on `app/settings/roles`. Service-role write to the admin auth
  project's `users.role` via `setStaffRole()`; refuses a change that would
  leave zero `OWNER`s.
- **Cancel / Resend** a pending invite: `cancelStaffInvite` /
  `resendStaffInvite` (resend re-issues a fresh token + 1-hour window).
- Every one of these writes an `AuditLog` row (storefront DB), same as the
  catalogue/CMS actions.

Needs `AUTH_SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` + `EMAIL_FROM`, and
`NEXT_PUBLIC_ADMIN_URL` (see `.env.example`), plus the `staff_invites`
migration applied to the storefront DB. `sync_staff.sql`'s trigger still
seeds new rows as `READER` — the invite flow relies on that and promotes
afterwards, so no trigger change is needed.

How the built flow differs from an earlier sketch you may see referenced
elsewhere: it does **not** use Supabase's `inviteUserByEmail` (that mails a
Supabase-hosted link and needs SMTP configured on the auth project) — the
invite email is ours, via Resend, pointing at our own `/join/<token>` page,
and the auth identity is created only when the person submits a password
there. The Owner does **not** pick a role at invite time; everyone starts
`READER` and is promoted from the same screen afterwards. The
`sync_staff.sql` trigger is unchanged (still seeds `READER`), and
`setStaffRole()` writes `role` directly — the trigger never touches `role`
on conflict, so a later `auth.users` sync won't clobber it.

**Route map (all under `app/`):** `educational-material/books`
(product/inventory CMS — despite the path, this manages every product type,
not just books; see "The catalogue CMS lives under Books" below — with
`educational-material/books/new` and `educational-material/books/[id]`
create/edit forms), `orders`, `submissions` (self-publishing +
service-request queues in one view), `royalties`, `reviews` (moderation
queue), `analytics`, `settings/roles`, the three sibling
Educational-Materials inventory CMSs
(`educational-material/educational-charts`,
`educational-material/worksheets-activity-puzzles`,
`educational-material/teaching-learning-materials` — each with its own
`new`/`[id]` forms, all sharing `educational-material/_shared/`), the
placeholder Inventory-sidebar stubs
(`professional-materials/advocate-diary`, `publishing/self-publishing`,
`publishing/bulk-publishing`, `lifestyle`), plus the storefront-CMS routes:
`settings/site` (site branding/SEO/contact defaults), `settings/navigation`
(header/footer links), `content/banners` (homepage hero/promo),
`content/homepage` (every other heading and description on the homepage),
`content/faqs`, `content/testimonials`, `settings/pricing` (delivery,
bundle, GST, class-set tiers, discount codes), and the `api/uploads` Route
Handler behind the image fields.

**The catalogue CMS lives under Books, not `/catalogue`.** The product
create/edit/publish forms manage every `Product` regardless of `type`
(printed book, e-book, or service package) but live at
`educational-material/books` because that's the Inventory sidebar item the
Owner asked them to sit behind — `sidebar-nav.tsx`'s "Books" entry links
straight there. Because its list query is `type IN (PHYSICAL_BOOK, EBOOK)`
*and* `productLine: "BOOK"`, it stays a books-only view even though the
three sibling lines below are also `PHYSICAL_BOOK`.

**Educational Charts / Worksheets & Activity Puzzles / Teaching & Learning
Materials share one CMS.** These three lines are all plain shippable
physical products, so instead of a Books-sized form each they share a
trimmed list, form, schema and Server Actions in
`educational-material/_shared/` (a `_`-prefixed, non-routable folder). Each
route folder (`educational-material/<slug>/{page,new/page,[id]/page}.tsx`)
is a thin wrapper that looks up its `ProductLineConfig` by slug from
`_shared/product-line-config.ts` — the one place the per-line wording
lives — and passes it down. The Server Actions
(`createLineProduct`/`updateLineProduct`/`toggleLineProductPublished`) take
the route slug as a bound first argument, which resolves to the
`ProductLine` enum value written to `Product.productLine` and to the
redirect/`revalidatePath` target. The rows are `type: "PHYSICAL_BOOK"`
(fulfilment mechanics only) with `bookFormats: []`; `productLine` is what
classifies them. `_shared/product-line-config.ts` mirrors
`PRODUCT_LINE_CATALOG` in `@repo/database`'s `taxonomy.ts` by hand, same as
`FIXED_DEPARTMENTS`.

The remaining Inventory-sidebar routes (`professional-materials/advocate-diary`,
`publishing/self-publishing`, `publishing/bulk-publishing`, `lifestyle`)
are still `EmptyState` stubs pointing back at Books. Adding one now is a
matter of another route folder + config entry like the three simple lines
above (or, for Books-like complexity, its own form). See
`sidebar-nav.tsx`'s `FIXED_DEPARTMENTS` for how each Inventory link is
wired.

**Admin is a full CMS for `apps/web`'s content, not just the product
catalogue.** `educational-material/books`, the three
`educational-material/{educational-charts,worksheets-activity-puzzles,teaching-learning-materials}`
lines, `settings/site`, `settings/navigation`,
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
`educational-material/books/product-form.tsx` is a Client Component *because* of this — the
product type is picked first and only the fields that apply to it render,
and the web address is generated from the title.

**Image uploads skip the malware-scan pipeline on purpose.**
`api/uploads/route.ts` checks the caller's role, caps size at 4 MB (under
Vercel's 4.5 MB request-body limit), and verifies the file's *magic bytes*
rather than trusting `file.type`. It refuses SVG, which can carry script
and isn't sanitised anywhere — an SVG logo has to be pointed at by URL. It
calls `uploadImage()` in `packages/storage`, which writes straight to the
public `images` **Supabase Storage** bucket (service-role client, so it
bypasses Storage RLS — safe because the role + magic-byte checks already
ran) instead of going through `uploadToStaging`/`promoteFromStaging`: that
pipeline exists for untrusted customer manuscripts, still runs on Vercel
Blob, and the scan behind it is still a stub that always returns
`"CLEAN"`. Needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
(both already required by this app); `isImageUploadConfigured()` gates the
route so a missing config falls back to "paste a URL" instead of throwing.

**Still read-only stubs:** `orders`, `submissions`, `royalties`, `reviews`,
`analytics` — these still do a direct read-only Prisma query with no
create/update forms or status-change actions wired up yet (see the root
README's "What's real vs. what's a stub" list). `settings/roles` is now
fully wired — see "Staff access is Owner-granted" above.
