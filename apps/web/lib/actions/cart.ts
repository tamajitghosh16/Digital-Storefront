"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@repo/auth/server";
import { parseLineId, prisma } from "@repo/database";
import { cachedQuery } from "@repo/cache/query";
import { TTL } from "@repo/cache/policy";
import { COVER_ENTRY_TAGS } from "@repo/cache/tags";
import { isHttpsUrl } from "@repo/security/href";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import type { CartItem } from "@/lib/cart-store";

/**
 * Live stock for the cart's shipped lines, so the cart shows what staff last
 * set in apps/admin rather than the figure it remembered when each line was
 * added (`CartItem.stockQty` is a snapshot). Read straight through Prisma, not
 * `lib/products-cache.ts`, for the same reason checkout is: this is the last
 * screen before a charge.
 *
 * Display only — `startCheckout` / `placeCodOrder` still re-check every line
 * themselves, so a stale or skipped refresh can't oversell.
 *
 * Open to guests (they have carts too), so rate-limited by user or IP.
 */

const MAX_LINES = 50;
const LINE_ID = /^[A-Za-z0-9_-]{1,64}(:(paperback|hardcover|ebook))?$/;

/** Units on hand per line id; `null` = not tracked, `0` = can't be bought (sold out, unpublished, or gone). */
export type CartStock = Record<string, number | null>;

export async function getCartStock(lineIds: string[]): Promise<CartStock | null> {
  if (!Array.isArray(lineIds) || lineIds.length === 0) return {};
  const ids = [...new Set(lineIds)].slice(0, MAX_LINES).filter((id) => typeof id === "string" && LINE_ID.test(id));

  const user = await getCurrentUser();
  const identity = user?.id ?? clientIp(await headers());
  if (!(await rateLimit(RATE_LIMITS.catalogueApi, identity)).ok) return null;

  const lines = ids.map((id) => ({ id, ...parseLineId(id) }));
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(lines.map((line) => line.productId))] } },
    select: {
      id: true,
      isPublished: true,
      stockQty: true,
      editions: { select: { format: true, stockQty: true } },
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const stock: CartStock = {};
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || !product.isPublished) {
      stock[line.id] = 0;
    } else if (line.format) {
      // An edition the book is no longer sold in can't be bought either.
      const edition = product.editions.find((candidate) => candidate.format === line.format);
      stock[line.id] = edition ? edition.stockQty : 0;
    } else {
      stock[line.id] = product.stockQty;
    }
  }
  return stock;
}

/** Front-cover URL per line id; `null` = no scan on file, so the cart draws the illustrated jacket. */
export type CartCovers = Record<string, string | null>;

/**
 * One product's cover URL, cached per product under `catalogue:covers`
 * (which any staff product save expires), so every cart holding a title
 * shares one entry. Covers are public and display-only — unlike stock above,
 * nothing is charged from them.
 */
const cachedCover = cachedQuery(
  { name: "products:cover", ttl: TTL.catalogue, tags: COVER_ENTRY_TAGS },
  async (productId: string) =>
    (await prisma.product.findUnique({ where: { id: productId }, select: { coverImageUrl: true } }))?.coverImageUrl ??
    null
);

/**
 * Each cart line's current cover, so a line added before it carried one (or
 * whose cover staff have since replaced) shows the real scan. Only `https`
 * URLs are returned — the same check every other cover render applies.
 * Display only; rate-limited like `getCartStock`.
 */
export async function getCartCovers(lineIds: string[]): Promise<CartCovers | null> {
  if (!Array.isArray(lineIds) || lineIds.length === 0) return {};
  const ids = [...new Set(lineIds)].slice(0, MAX_LINES).filter((id) => typeof id === "string" && LINE_ID.test(id));

  const user = await getCurrentUser();
  const identity = user?.id ?? clientIp(await headers());
  if (!(await rateLimit(RATE_LIMITS.catalogueApi, identity)).ok) return null;

  const lines = ids.map((id) => ({ id, productId: parseLineId(id).productId }));
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const urls = await Promise.all(productIds.map((productId) => cachedCover(productId)));
  const byId = new Map(productIds.map((productId, index) => [productId, urls[index]]));

  const covers: CartCovers = {};
  for (const line of lines) {
    const url = byId.get(line.productId);
    covers[line.id] = isHttpsUrl(url) ? url! : null;
  }
  return covers;
}

/**
 * The signed-in customer's saved cart (the `carts` row), which is what lets
 * a cart follow the account across browsers and devices. `components/commerce/
 * cart-sync.tsx` loads it on every page load and saves every change back.
 * Guests have no row — their cart lives in their browser only.
 *
 * The lines are the client's own snapshot (title, price, note), checked for
 * shape and size but not re-priced: they're display state, and
 * `startCheckout` / `placeCodOrder` price and stock-check every line from the
 * database regardless.
 */

const cartItemSchema = z.object({
  productId: z.string().regex(LINE_ID),
  title: z.string().max(300),
  priceCents: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(999),
  fulfillmentType: z.enum(["SHIP", "DIGITAL", "SERVICE"]),
  listPriceCents: z.number().int().min(0).max(100_000_000).optional(),
  taxType: z.enum(["PHYSICAL_BOOK", "EBOOK", "SERVICE_PACKAGE"]).optional(),
  note: z.string().max(300).optional(),
  stockQty: z.number().int().nullable().optional(),
  imageUrl: z
    .string()
    .max(2048)
    .refine((url) => isHttpsUrl(url))
    .nullable()
    .optional(),
}) satisfies z.ZodType<CartItem>;

const cartSchema = z.array(cartItemSchema).max(MAX_LINES);

/** `null` when signed out (or the request was refused), so the caller keeps what it has. */
export async function getSavedCart(): Promise<CartItem[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await rateLimit(RATE_LIMITS.catalogueApi, user.id)).ok) return null;

  const row = await prisma.cart.findUnique({ where: { userId: user.id }, select: { items: true } });
  if (!row) return [];
  // A row written by an older shape of CartItem is dropped line by line, not wholesale.
  const items = Array.isArray(row.items) ? row.items : [];
  return items.flatMap((item) => {
    const parsed = cartItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

type SaveCartResult = { ok: true } | { ok: false; error: "SIGN_IN_REQUIRED" | "INVALID" | "RATE_LIMITED" };

export async function saveCart(items: CartItem[]): Promise<SaveCartResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };
  if (!(await rateLimit(RATE_LIMITS.accountWrite, user.id)).ok) return { ok: false, error: "RATE_LIMITED" };

  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id, items: parsed.data },
    update: { items: parsed.data },
  });
  return { ok: true };
}
