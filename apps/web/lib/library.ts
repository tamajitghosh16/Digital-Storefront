import "server-only";
import { prisma, type OrderStatus, type Prisma } from "@repo/database";

/**
 * E-book entitlement rules, shared by the library page and the download
 * route so the two can never disagree about who may download what
 * (docs/security-roadmap.md, H3):
 *
 *  - only through an order line with `includesEbook` — a print-only line of
 *    a title that also sells as an e-book does not unlock the PDF;
 *  - only while the order is paid or further along in fulfilment (a
 *    refunded or cancelled order loses access);
 *  - only for files that passed the malware scan.
 *
 * Downloads are counted per (customer, file) in `LibraryDownload`, against
 * `FileAsset.maxDownloads` as a per-customer allowance.
 */
export const ENTITLING_ORDER_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "READY_FOR_DOWNLOAD",
];

export function entitledAssetsWhere(userId: string): Prisma.FileAssetWhereInput {
  return {
    kind: "EBOOK_FILE",
    malwareScanStatus: "CLEAN",
    product: {
      orderItems: {
        some: { includesEbook: true, order: { userId, status: { in: ENTITLING_ORDER_STATUSES } } },
      },
    },
  };
}

/**
 * Whether the customer already holds the e-book of any of these products,
 * by the same rule as `entitledAssetsWhere` minus the file checks — a
 * purchase is what's owned, whether or not its PDF has been uploaded yet.
 * The book page disables the e-book option on it and checkout refuses to
 * sell it twice.
 */
export async function ownsEbook(userId: string, productIds: string[]): Promise<boolean> {
  if (!productIds.length) return false;
  const line = await prisma.orderItem.findFirst({
    where: {
      productId: { in: productIds },
      includesEbook: true,
      order: { userId, status: { in: ENTITLING_ORDER_STATUSES } },
    },
    select: { id: true },
  });
  return line !== null;
}
