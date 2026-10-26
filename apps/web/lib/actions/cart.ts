"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@repo/auth/server";
import { parseLineId, prisma } from "@repo/database";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";

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
