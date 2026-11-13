import "server-only";
import { prisma, type ProductLine } from "@repo/database";
import type { ProductRef } from "@repo/cache/tags";
import { deleteEbookFile } from "@repo/storage";

/** What a list's Delete button gets back: nothing on success, a message to show in the dialog otherwise. */
export type DeleteProductResult = { error?: string };

/**
 * Permanently remove one inventory item — the shared body of the Books and
 * simpler product-line delete actions. The caller has already checked the
 * staff role; this only checks the row and does the delete.
 *
 * `productLine` is the line the calling list belongs to, so a Books delete
 * can't reach a chart (or the other way round) by passing another id.
 *
 * An item that has ever been ordered — by a customer or on a purchase order
 * — is refused rather than deleted: those lines keep a foreign key to the
 * product, and order history has to survive. Hiding it does what the
 * operator actually wants there. Its editions, reviews and wishlist entries
 * cascade with it; its e-book FileAssets are removed here (that relation
 * doesn't cascade) and the stored PDFs cleared best-effort afterwards.
 * Cover images stay in the public `images/` bucket — there's no delete
 * helper for those yet, and a stray image is harmless.
 */
export async function deleteInventoryProduct(
  id: string,
  productLine: ProductLine,
  actor: { id: string; email: string }
): Promise<DeleteProductResult & { deleted?: ProductRef }> {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      title: true,
      slug: true,
      productLine: true,
      type: true,
      fileAssets: { select: { id: true, blobPath: true } },
      _count: { select: { orderItems: true, purchaseOrderItems: true } },
    },
  });
  if (!product || product.productLine !== productLine) {
    return { error: "That item no longer exists — refresh the page." };
  }

  if (product._count.orderItems > 0 || product._count.purchaseOrderItems > 0) {
    return {
      error: `“${product.title}” is part of past orders, so it can't be deleted. Hide it instead to take it off the storefront.`,
    };
  }

  await prisma.$transaction([
    prisma.fileAsset.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action: "product.deleted",
        entity: "Product",
        entityId: id,
        diff: { title: product.title, slug: product.slug, productLine },
      },
    }),
  ]);

  for (const asset of product.fileAssets) {
    if (asset.blobPath && !/^https?:\/\//.test(asset.blobPath)) await deleteEbookFile(asset.blobPath);
  }

  // What the caller expires on the storefront (`productChangedTags`).
  return { deleted: { slug: product.slug, productLine: product.productLine, type: product.type } };
}
