# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Digital Storefront for Shashibhushan's New School Book Press: physical/digital
book sales, e-book creation services, and a self-publishing portal. npm
workspaces + Turborepo monorepo containing two independently deployed
Next.js 16 apps (`apps/web`, `apps/admin`) that share code via
`packages/*` but never call each other at runtime — they only share a
Supabase Postgres database. See `apps/web/CLAUDE.md` and
`apps/admin/CLAUDE.md` for app-specific commands and architecture.

This is a Phase 0 scaffold, not a finished app — check README.md's "What's
real vs. what's a stub" section before assuming a feature is implemented.
Full HLD/LLD/data model/system design lives in
`docs/Digital_Storefront_Technical_Design_Document_v1.1.docx`; consult it
before making architectural changes.

## Commands

Run from the repo root unless noted. This repo uses **npm workspaces**, not pnpm/yarn.

```bash
npm install                              # installs and links all workspace packages
npm run dev                              # both apps in parallel (web :3000, admin :3001)
npm run dev:web                          # apps/web only
npm run dev:admin                        # apps/admin only
npm run build                            # turbo build, both apps
npm run lint                             # turbo lint, both apps
npm run typecheck                        # turbo typecheck, both apps
```

There is no test suite yet — `turbo.json` has a `test` task wired up but no
package defines a `test` script. The Technical Design Document specifies
Vitest + Playwright for when tests are added.

Database (all proxy into `packages/database`'s Prisma scripts):

```bash
npm run db:generate                      # regenerate the Prisma client — do this after any schema.prisma change
npm run db:migrate                       # prisma migrate dev, against Supabase
npm run db:studio                        # prisma studio
npm run migrate:deploy --workspace=@repo/database
npm run seed --workspace=@repo/database  # adds 3 sample products
```

To run any script in a single workspace directly: `npm run <script> --workspace=<name>` (app names are `web`/`admin`; package names are `@repo/database`, `@repo/auth`, etc.).

Each app needs its own `.env.local`, copied from that app's own `.env.example`
(`apps/web/.env.example`, `apps/admin/.env.example` — deliberately different
lists, e.g. only `web` gets `NEXT_PUBLIC_RAZORPAY_KEY_ID`, only `admin` gets
`SUPABASE_SERVICE_ROLE_KEY`) before `dev`/`build` will connect to anything
real. The Prisma CLI (`db:generate`/`db:migrate`, run via `packages/database`)
reads its own `packages/database/.env`, copied from
`packages/database/.env.example`, since it runs as a separate process outside
either app's Next.js env loading.

## Architecture

**Two standalone apps, one shared data layer.** The monorepo exists only
to share source code — `packages/database`, `packages/auth`,
`packages/payments`, `packages/storage`, `packages/email`, `packages/jobs`,
`packages/ui`, `packages/config` — between `apps/web` (public storefront +
customer account area) and `apps/admin` (internal back office, staff-only).
Each app has its own `package.json`, `next.config.ts`, port, and is meant
to deploy as its own Vercel project (Root Directory = `apps/web` or
`apps/admin`). Neither app imports from the other.

**`packages/database` is the single source of truth for the data model.**
`prisma/schema.prisma` mirrors the BRD's entities one-to-one (User,
Product, Order/OrderItem, SelfPublishingProject, ServiceRequest, Royalty,
Review, Payment, FileAsset, Notification, AuditLog). Both apps import the
same Prisma client singleton from `packages/database/src/client.ts`. After
editing `schema.prisma`, run `npm run db:generate` before either app will
typecheck against the new shape.

**Auth is Supabase Auth, wrapped by `packages/auth`.** `src/server.ts`
(Server Components/Actions), `src/client.ts` (Client Components), and
`src/middleware.ts` (a middleware *factory* — each app's `middleware.ts`
calls `createAuthMiddleware()` with its own options; `apps/admin` passes
`allowedRoles: ADMIN_ROLES` to lock the whole app down, `apps/web` doesn't).
Role authorization is checked twice by design: loosely in middleware (a UX
redirect, not a security boundary) and again inside every Server Action via
`assertRole()` from `packages/auth/src/roles.ts`. Never rely on middleware
alone to protect a mutation.

`public.users` is kept in sync with Supabase's own `auth.users` table by a
Postgres trigger in `packages/database/prisma/sql/sync_user.sql` — this has
to be run manually in the Supabase SQL editor, since Prisma doesn't manage
the `auth` schema. That same file defines the starter Row-Level Security
policies (a database-level backstop behind the app-level role checks).

**Payments run through `packages/payments` (Razorpay).** Order status is
only ever flipped to `PAID` by the signature-verified webhook at
`apps/web/app/api/webhooks/razorpay/route.ts` — the client-side redirect
after checkout is never trusted as the source of truth.

**Notifications and background work are event-driven via `packages/jobs`
(Inngest).** `src/client.ts` defines the full event catalogue; functions in
`src/functions/*` are served from `apps/web/app/api/inngest/route.ts`. A
mutation that needs to notify someone or trigger async work should
`inngest.send()` an event rather than calling email/scan code directly —
that's what keeps the fan-out logic in one place instead of scattered
across every Server Action.

**File uploads go through `packages/storage` (Vercel Blob)** using a
staging → malware-scan → promote pattern. The scan itself
(`packages/jobs/src/functions/malwareScan.ts`) is currently a stub that
always returns `"CLEAN"` — it needs a real Cloudmersive or ClamAV
integration before any upload pipeline built on top of it is safe to ship.

**Shared UI/config:** `packages/ui` (a shadcn/ui-style `Button` +
`cn()`), `packages/config` (shared `tsconfig`, ESLint flat config, and
Tailwind v4 design tokens via `@theme` in `tailwind-preset.css`, which both
apps' `globals.css` import).
