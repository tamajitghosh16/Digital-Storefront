# Inventory management — design notes

Written after reviewing the current schema, the admin catalogue module, and
Shopify's inventory documentation (linked below) for vocabulary and a sanity
check on the state model. This is a plan, not yet implemented.

- https://help.shopify.com/en/manual/products/inventory
- https://help.shopify.com/en/manual/products/inventory/fundamentals/inventory-states
- https://help.shopify.com/en/manual/products/inventory/fundamentals/understanding-inventory-management

## Where this fits today

`Product.stockQty` already exists (`packages/database/prisma/schema.prisma`),
is shown only for `PHYSICAL_BOOK` in the catalogue form
(`apps/admin/app/educational-material/books/product-form.tsx`, with the help
text "Leave empty if you aren't counting stock"), and is edited as a plain
number by `updateProduct`/`createProduct`
(`apps/admin/app/educational-material/books/actions.ts`). Nothing decrements
it. Per `progress-report.md`, the checkout Server Action that would create an
`Order`/`OrderItem` doesn't exist yet — "Pay with Razorpay" has no handler.
That's actually the right moment to design inventory properly: the
reservation logic below is meant to be built *into* that Server Action, not
bolted on afterward.

## Scope: don't build full Shopify

Shopify's model exists for merchants with variants, multiple warehouses,
transfers, and purchase orders. This storefront sells non-variant physical
books, e-books (unlimited, digital, no stock concept), and service packages
(capacity is `turnaroundDays`, not a count). There's one publisher, one place
books are stored. Building locations, incoming-transfer tracking, or
purchase orders now would be speculative — nothing in the BRD or the
Technical Design Document mentions a second warehouse.

What's worth borrowing from Shopify's fundamentals doc is the *shape* of the
model — a perpetual ledger of adjustments backing a current-quantity
snapshot, not just an editable number — and from the inventory-states doc,
the vocabulary for splitting "how many exist" from "how many are actually
sellable right now." Concretely:

| Shopify state | Use here? | Notes |
|---|---|---|
| On hand | Yes | `Product.stockQty` — physical copies actually at the press |
| Committed | Yes | New `Product.committedQty` — copies tied to a placed-but-not-yet-fulfilled order |
| Available | Yes (computed) | `stockQty - committedQty`, never stored |
| Incoming | Not yet | No purchase-order/reprint tracking exists; revisit if reprint runs need scheduling |
| Unavailable (damaged/reserved) | Partial | Folded into `StockMovement` reason codes (see below) rather than a separate held-back quantity, since there's no case yet for reserving stock outside an order |

This keeps the two numbers that actually prevent overselling and drops the
rest until there's a real need for them.

## Data model

Two additions to `packages/database/prisma/schema.prisma`:

```prisma
model Product {
  // ...existing fields...
  stockQty          Int?     // on hand — already exists
  committedQty      Int      @default(0) // reserved by open orders, PHYSICAL_BOOK only
  lowStockThreshold Int?     // available <= this ⇒ low-stock notification

  stockMovements    StockMovement[]
}

enum StockMovementType {
  SALE_RESERVED      // order placed, not yet paid — committedQty += qty
  SALE_CONFIRMED     // order paid — stockQty -= qty, committedQty -= qty
  SALE_RELEASED      // order cancelled/expired unpaid — committedQty -= qty
  RESTOCK            // new copies received
  RETURN             // customer return, back on the shelf
  DAMAGE             // written off — stockQty -= qty, no sale
  CORRECTION         // manual count correction (physical stock-take)
}

model StockMovement {
  id                String            @id @default(cuid())
  productId         String
  product           Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  type              StockMovementType
  quantityDelta     Int               // signed: negative = decrease
  resultingOnHand   Int
  resultingCommitted Int
  orderId           String?           // set for SALE_* movements
  actorId           String?           @db.Uuid // null for system-triggered (webhook, expiry job)
  note              String?
  createdAt         DateTime          @default(now())

  @@index([productId, createdAt])
  @@index([orderId])
  @@map("stock_movements")
}
```

`StockMovement` is the ledger — the audit trail the fundamentals doc calls
"the history of inventory adjustments." `stockQty`/`committedQty` on
`Product` stay as fast-read denormalized snapshots, always written in the
same transaction as the movement row that explains the change. This mirrors
how `AuditLog` already works for catalogue edits — same idea, applied to a
number that needs to be right under concurrent writes, not just logged.

## Reserve at order creation, confirm at payment

`OrderStatus` already has `PENDING → PAID → PROCESSING → ...` and
`CANCELLED`. Map inventory state transitions onto those:

1. **Checkout Server Action creates the `Order`** (still to be built). In the
   same transaction, for every `OrderItem` with `fulfillmentType: SHIP`,
   increment `committedQty` — this is what keeps two customers from both
   "buying" the last copy while the first one is on the Razorpay redirect.
2. **Razorpay webhook flips the order to `PAID`** (`apps/web/app/api/webhooks/razorpay/route.ts`,
   already real). Add: decrement `stockQty` and `committedQty` together —
   the reservation becomes an actual sale.
3. **Order never gets paid.** Add an Inngest function — same pattern as the
   existing ones in `packages/jobs/src/functions` — that does
   `step.sleep("30m")` after order creation, then checks if the order is
   still `PENDING`; if so, flips it to `CANCELLED` and releases the
   `committedQty`. This also covers abandoned Razorpay checkouts, which
   otherwise commit stock forever.

### The concurrency problem, and why Prisma's normal API can't guard it

The check that must hold is `stockQty - committedQty >= quantity`, i.e. a
comparison between two columns on the same row. Prisma's `where` filters
compare a column against a value, not against another column, so the usual
`updateMany({ where: { stockQty: { gte: qty } }, data: { ... } })` trick
(which works fine for `stockQty` alone) can't express "available" directly.
Use a raw parameterized update instead, inside the same transaction that
creates the order:

```ts
const [row] = await tx.$queryRaw<{ id: string }[]>`
  UPDATE products
  SET "committedQty" = "committedQty" + ${qty}
  WHERE id = ${productId}
    AND "stockQty" - "committedQty" >= ${qty}
  RETURNING id
`;
if (!row) {
  // not enough available stock — abort the whole order creation
}
```

Zero rows returned means someone else claimed the remaining stock first;
the caller should abort order creation with a "this title just sold out"
message rather than retry. Insert the matching `StockMovement` row in the
same transaction, using `resultingOnHand`/`resultingCommitted` read back
from that same query (or a follow-up `SELECT` inside the transaction) so the
ledger and the snapshot never disagree.

## Admin UI

- **Catalogue list** (`apps/admin/app/educational-material/books/page.tsx`):
  replace the plain `stockQty` column with `available` (computed), and a
  `Pill` when `available <= lowStockThreshold` — same `Pill` component
  already used for the published/hidden state.
- **Product edit page**: turn "Copies in stock" from a freely-editable
  number into a read-only display of on hand/committed/available, plus a
  small "Adjust stock" form (delta + reason from `StockMovementType`,
  excluding the `SALE_*` types which only the checkout/webhook/expiry code
  should write) that calls a new Server Action. Gate it with
  `assertRole(user?.role, CATALOGUE_WRITE_ROLES)` — same roles that already
  own catalogue writes, no new role needed — and write both the
  `StockMovement` and an `AuditLog` row (`action: "product.stock_adjusted"`),
  matching the pattern every other catalogue mutation already follows.
- **Movement history**: a simple list under the product, newest first, from
  `StockMovement` — this is the "history of inventory adjustments" Shopify's
  docs describe, and it's needed the first time someone asks "why does this
  book show 3 copies."
- **Low-stock notification**: add `"inventory/low_stock"` to the event
  catalogue in `packages/jobs/src/client.ts` (same shape as
  `"submission/received"`, which already fans out to staff emails), fire it
  from the stock-adjustment Server Action and from the payment webhook
  whenever a movement brings `available` at or below
  `lowStockThreshold`. A new Inngest function creates `Notification` rows
  for `EDITOR`/`OWNER` and sends the existing Resend email path — no new
  infrastructure, just a new event and function following the file already
  there.

## What this deliberately leaves out

- **Locations.** One place inventory lives; add a `Location` model and a
  `locationId` on `StockMovement`/`Product` only when there's an actual
  second warehouse or fulfillment partner — the ledger table shape doesn't
  need to change to add that later, only get a new foreign key.
- **Incoming/purchase orders.** Reprints aren't modeled anywhere else in the
  schema yet. If reprint scheduling becomes a real workflow, `RESTOCK`
  movements can grow an `expectedAt`/`poReference` pair, or a proper
  `IncomingShipment` model, without touching the reservation logic above.
- **Per-unit/serial tracking, safety stock as a separate held-back number.**
  Not asked for anywhere in the BRD; `DAMAGE`/`CORRECTION` movement reasons
  cover the "physically present but not sellable" cases Shopify calls
  "Unavailable" well enough at this scale.

## Suggested order of work

This slots into README's existing roadmap step 2 ("cart → checkout →
Razorpay → webhook confirms PAID") rather than being a separate phase:

1. Migration: add `committedQty`, `lowStockThreshold` to `Product`, add
   `StockMovement` + `StockMovementType`.
2. Build the checkout Server Action with the reserve-on-create logic above —
   it needs this atomicity regardless of inventory, since it's also where
   the `Order`/`OrderItem`/`Payment` rows get created together.
3. Extend the Razorpay webhook route to confirm the reservation on `PAID`.
4. Add the expiry Inngest function for abandoned `PENDING` orders.
5. Admin: adjustments form + movement history + low-stock pill on the
   catalogue list.
6. `inventory/low_stock` event + Inngest notification function.

Steps 1–4 are the load-bearing part — they're what stops overselling.
5–6 are what makes stock levels manageable day to day; ship them in the same
PR or right after, but 1–4 are the part that has to be correct before
checkout goes live.
