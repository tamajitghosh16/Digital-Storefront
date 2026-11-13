# ADR 0001 — Caching strategy

- **Status:** Accepted
- **Date:** 2026-11-12
- **Scope:** `apps/web`, `apps/admin`, `packages/cache`

## Context

Every storefront page renders on request. The per-request nonce
Content-Security-Policy (`apps/web/proxy.ts`) can't be put into prerendered
HTML. The root layout also reads the visitor's session. So whole-page caching
is not available: no ISR, no CDN-cached HTML, no Partial Prerendering. Next's
own guide says "PPR is incompatible with nonce-based CSP"
(`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).

What a page renders is mostly data that changes a few times a week: site
settings, copy, menus, banners and the catalogue. Before this decision:

- The storefront already cached two coarse groups (`cms`, `products`) with
  `unstable_cache` and a 60-second expiry.
- Several public pages bypassed that cache.
- Every order and every admin save emptied the entire catalogue cache.
- The cache was per process. Production is **Hostinger**, which runs
  separate processes (the bare domain and `www`), stops idle sites, and
  starts every redeploy cold.
- There was no way to tell whether the cache worked.

## Decision

### Layers

| Layer | What | Where | Freshness |
|---|---|---|---|
| Browser / CDN | `/_next/static` (hashed); resized covers (`/_next/image`); `public/` images and logos; `/api/books` | HTTP `Cache-Control` | immutable; 31 days; 1 h + 1 day stale; 60 s shared + 240 s stale, with ETag |
| Client | Catalogue scroll pages; cart stock and covers | TanStack Query (`apps/web/components/layout/query-provider.tsx`) | 60 s fresh, forgotten after 5 min; cart stock never fresh |
| Request | Identical reads within one render | `cachedQuery()` request scope (React `cache()`) | one request |
| In flight | Identical concurrent reads in one process | `cachedQuery()` coalescing | one query |
| Process (Redis mode) | Entries and tag invalidation times | LRU inside `apps/web/cache-handler.mjs` | tags re-checked at most every 1 s |
| Shared | Every cached read | Upstash Redis via a custom Next `cacheHandler` when `CACHE_STORE=redis`; otherwise Next's built-in per-process cache | tag invalidation at once; 5-minute backstop |

All server-side caching goes through one function, `cachedQuery()` in
`packages/cache/src/query.ts`. Callers name the entry, its TTL and its tags.
Nothing calls `unstable_cache` directly.

### Freshness policy (`packages/cache/src/policy.ts`)

- **Invalidation is the normal path.** Every change expires exactly the
  tags of what it changed, at once (`expire: 0`, not served stale).
- **TTL is only the backstop** for a lost signal. The worst case is
  **5 minutes** for anything a shopper sees, and 1 minute for admin's
  dashboard aggregates.

### Tags (`packages/cache/src/tags.ts`)

Every entry carries an umbrella tag (`cms` or `catalogue`) plus narrow tags
for what it was built from:

- **CMS:** `cms:settings`, `cms:pricing`, `cms:content`, `cms:nav`,
  `cms:menu`, `cms:banners`, `cms:testimonials`, `cms:faqs`.
- **Catalogue:**
  - `catalogue:<ProductLine>` for listings, counts and related rows;
  - `catalogue:services`;
  - `catalogue:covers`;
  - `product:<slug>` for single-product pages.

Writers never spell tags themselves; they call event builders:

- `cmsChangedTags(section)`;
- `productChangedTags(before, after)`, with old and new, because an edit
  can rename a slug or move an item between listings;
- `stockTakenTags(moves)`;
- `stockReturnedTags(products)`.

### Invalidation paths

- **Storefront (checkout):** `revalidateTag` for `stockTakenTags` or
  `stockReturnedTags` (`apps/web/lib/stock.ts`).
- **Admin:** `revalidateStorefront(tags, productIds)`
  (`apps/admin/lib/storefront-cache.ts`) does three things:
  1. expires the tags in admin's own cache;
  2. with `CACHE_STORE=redis`, writes the tags straight into the
     storefront's Redis tag ledger (`packages/cache/src/invalidate.ts`).
     This works even while the storefront is asleep, and every storefront
     process honours it within a second;
  3. pings `/api/revalidate` with `{ tags, productIds }`. The storefront
     expires the tags in its own process and pre-builds only those
     products' cover images. A ping with no body (an older admin deploy)
     still expires everything, so the two apps can be deployed in either
     order. The format is pinned by
     `apps/admin/testing/contracts/storefront-revalidate.contract.json`.

### The Redis cache handler (`apps/web/cache-handler.mjs`)

The handler is wired in by `apps/web/next.config.ts` only when
`CACHE_STORE=redis` at build time.

- **Storage.** Entries live at `sfc:<namespace>:e:<key>`, with a TTL of
  twice their revalidate time (at most 1 day). The last invalidation time
  of each tag lives at `sfc:<namespace>:t:<tag>`.
- **Expiry rule.** An entry is dead when any of its tags was invalidated
  after the lookup that missed. It is judged against the time of that
  lookup, not the time it was stored, so a query that raced an
  invalidation can't store stale data as fresh.
- **Failure handling.** Every Redis call has a 1 s timeout. That is long
  enough for a cold process's first TLS handshake: at 250 ms, a restart
  after an idle stop tripped the breaker and skipped the cache for its
  first 30 s. On failure
  the handler serves what it holds in memory or treats the lookup as a
  miss, so the page reads the database. It never throws. Three failures
  in a row open a breaker for 30 s and log `cache.store_unavailable` once.
- **Implicit path tags** (from `revalidatePath`) are checked only within
  the process. The storefront never calls `revalidatePath`, and admin never
  writes these tags.
- **Optimized images** stay on disk; Redis is the wrong store for binaries.

### Never cached

- **Checkout pricing and stock checks.** `prepareOrder` re-reads every
  `Product`, and checkout and the cart call `getPricingConfig()` live.
- **Discount codes.**
- **Anything per user:** wishlist, library, orders, account, e-book
  ownership.
- **`getCartStock`.**
- **The session, the staff role and the proxy role check.** A demotion
  must apply at once.
- **Admin's order queues,** the dashboard's "needs attention" counts and
  its recent orders.
- **Database errors.** Content and pricing are read with throwing loaders
  (`loadContent`, `loadPricingConfig`) inside the cache, and fall back to
  defaults outside it.

### Listing stock trade-off

An order expires the product's own page every time. It expires the
product's listing only when the order leaves fewer than `LOW_STOCK_MAX`
copies, where the tile shows an exact count or "out of stock", or takes the
title below `SAME_DAY_MIN`, which changes the same-day badge and filter.
Otherwise the tile reads "Ships in 2 days" before and after, so busy
trading no longer empties every listing. The cart and checkout always
re-check stock live.

### Observability

`cachedQuery()` and the Redis handler count lookups, hits, misses, entries
dropped by tag, and Redis errors and latency. Each process logs one
`{"event":"cache.stats",…}` line a minute. `CACHE_DEBUG=1` also logs every
miss.

### Configuration

| Variable | Where | Meaning |
|---|---|---|
| `CACHE_STORE` | web + admin, **before the build** | `redis` puts the storefront's data cache in Redis; unset means Next's built-in cache |
| `CACHE_NAMESPACE` | web + admin, identical | separates environments sharing one Redis (`prod`, `staging`) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | web + admin | the rate limiter's Redis, reused |
| `CACHE_DEBUG` | either | `1` logs every miss |

Both apps' `instrumentation.ts` refuse to boot in production when
`CACHE_STORE=redis` lacks credentials or a namespace
(`packages/cache/src/env.ts`).

## Alternatives rejected

- **Cache Components / `'use cache'` / PPR.** They need a hash-based (SRI)
  CSP instead of nonces, which is experimental in Next 16. Revisit when that
  is stable; because every read goes through `cachedQuery()`, the switch
  touches one module.
- **Full-page or CDN HTML caching.** Ruled out by the nonce CSP and the
  per-visitor header.
- **A third-party cache handler package.** The ones listed for Next are
  built on the TCP Redis protocol, not Upstash's REST API, and would add a
  dependency for about 250 lines of handler code.
- **Redis in apps/admin.** It is one low-traffic process; Next's built-in
  cache is enough, and admin's own saves expire its own entries in-process.
- **Caching per-user data, or the staff role.** Correctness and security
  outweigh the saving.

## Consequences

- Shoppers see staff edits on their next page view. If every signal is
  lost, they see them within 5 minutes. Listing badges for well-stocked
  titles can lag an order by up to 5 minutes.
- **Revisit when:**
  - the storefront scales beyond one process, or moves off Hostinger
    (Vercel already shares its data cache, so leave `CACHE_STORE` unset
    there);
  - the CSP moves to SRI;
  - order volume makes the per-order `product:<slug>` expiry itself
    costly.
- New storefront-visible data must be read through `cachedQuery()` with
  taxonomy tags, and every write to it must call `revalidateStorefront()`
  (admin) or `revalidateTag()` (storefront) with the matching event
  builder. Review moderation, when built, must call
  `revalidateStorefront(productChangedTags(product))`.
