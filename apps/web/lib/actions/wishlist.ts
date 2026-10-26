"use server";

import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { RATE_LIMITS, rateLimit } from "@repo/security/rate-limit";

const PRODUCT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Server actions backing the heart button (catalogue tiles, product page)
 * and the account wishlist page. There is no client-side wishlist store —
 * unlike the cart, a wishlist is meaningless to a guest, so every action
 * here requires a signed-in user and reads/writes straight through Prisma.
 */

export async function getWishlistedProductIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.wishlist.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}

type ToggleResult =
  | { ok: true; wishlisted: boolean }
  | { ok: false; error: "SIGN_IN_REQUIRED" | "NOT_FOUND" | "RATE_LIMITED" };

export async function toggleWishlist(productId: string): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };
  if (!(await rateLimit(RATE_LIMITS.accountWrite, user.id)).ok) return { ok: false, error: "RATE_LIMITED" };
  if (typeof productId !== "string" || !PRODUCT_ID.test(productId)) return { ok: false, error: "NOT_FOUND" };

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return { ok: true, wishlisted: false };
  }

  // Only published products can be saved — unpublished ids must not be
  // confirmable by probing this action.
  const product = await prisma.product.findFirst({ where: { id: productId, isPublished: true }, select: { id: true } });
  if (!product) return { ok: false, error: "NOT_FOUND" };

  await prisma.wishlist.create({ data: { userId: user.id, productId } });
  return { ok: true, wishlisted: true };
}

export async function removeFromWishlist(productId: string): Promise<{ ok: true }> {
  const user = await getCurrentUser();
  if (!user || typeof productId !== "string" || !PRODUCT_ID.test(productId)) return { ok: true };

  await prisma.wishlist.deleteMany({ where: { userId: user.id, productId } });
  return { ok: true };
}
