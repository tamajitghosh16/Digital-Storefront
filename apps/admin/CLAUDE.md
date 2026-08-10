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
Unlike `apps/web`, `middleware.ts` here locks every route to
`ADMIN_ROLES` (`SUPPORT`, `EDITOR`, `OWNER` — from `packages/auth/src/roles.ts`)
by default; the `matcher` excludes only `/sign-in`, `/unauthorized`, and
static assets. There's no "public" area in this app.

**Owner-only pages are not further restricted by middleware.**
`app/settings/roles/page.tsx`, for example, is reachable by any admin role
at the middleware layer — Owner-only-ness comes entirely from an explicit
`assertRole(role, OWNER_ONLY_ROLES)` inside its Server Actions. Don't
assume a page under this app is Owner-only just because it looks
sensitive; check for an explicit `assertRole` call.

**Staff access is Owner-granted, not self-service — designed, not yet
built.** There's no sign-up path into staff roles; every `SUPPORT` /
`EDITOR` account exists because the Owner put it there from
`settings/roles`. The intended flow, once `settings/roles` grows its
Server Actions:
- **Invite new staff:** Owner enters an email + role (`SUPPORT` or
  `EDITOR`; granting `OWNER` is a separate, more deliberate action — see
  below). The action `assertRole(role, OWNER_ONLY_ROLES)`, then calls
  Supabase's admin API, `auth.admin.inviteUserByEmail(email, { data: {
  role } })` — this requires `SUPABASE_SERVICE_ROLE_KEY`, which is why
  invites can only be sent from `apps/admin`, never `apps/web`. Supabase
  emails the invite; the person sets a password and is signed in.
  `sync_user.sql`'s trigger needs a matching change before this works —
  it currently hardcodes new rows to `'READER'` — to instead insert
  `coalesce(new.raw_user_meta_data->>'role', 'READER')`, so an invited
  staff member lands in `public.users` with the role the Owner chose
  instead of being created as `READER` and needing a second step.
- **Promote an existing account:** if the person already has a `READER`
  (or `SELF_PUB_AUTHOR`) account, the Owner looks them up by email on the
  same page and sets a role directly — a plain `prisma.user.update`,
  no Supabase Admin API call needed since `sync_user.sql`'s trigger only
  ever touches `email`/`updatedAt` on conflict, never `role`, so an
  app-side role change is never clobbered by a later auth.users sync.
- **Change or revoke a role:** same update path, moving someone back to
  `READER` removes their `ADMIN_ROLES` membership and locks them out of
  `apps/admin` at the next middleware check. The action must refuse a
  change that would leave zero `OWNER` accounts — that's the one guard
  beyond `assertRole` this page needs, since nothing else in the schema
  prevents a publisher from locking themselves out.
- Every one of these writes an `AuditLog` row, same as the catalogue/CMS
  actions — who has staff access is exactly the kind of change that
  needs a paper trail.

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
`settings/roles` is the one with its target design already written down —
see "Staff access is Owner-granted" above — so building it is a matter of
adding the two Server Actions and the `sync_user.sql` trigger change, not
inventing the flow from scratch.
