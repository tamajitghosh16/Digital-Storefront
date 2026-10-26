"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront-cache";
import { prisma, type BookFormat, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { purchaseOrderFormSchema } from "./schema";

// FR: raise a purchase order against a vendor — goes straight to SENT since
// there's no separate draft/send step in this form.
export async function createPurchaseOrder(formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = purchaseOrderFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/supply/purchase-orders/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const { vendorId, expectedAt, notes, items } = parsed.data;

  // A book is stocked per printed edition, so its line must name one the
  // book is actually sold in; any other product's line must not name one.
  const editions = await prisma.bookEdition.findMany({
    where: { productId: { in: items.map((item) => item.productId) }, format: { in: ["PAPERBACK", "HARDCOVER"] } },
    select: { productId: true, format: true },
  });
  const isBook = new Set(editions.map((edition) => edition.productId));
  const lineOk = items.every((item) =>
    item.bookFormat
      ? editions.some((edition) => edition.productId === item.productId && edition.format === item.bookFormat)
      : !isBook.has(item.productId)
  );
  if (!lineOk) {
    redirect(`/supply/purchase-orders/new?error=${encodeURIComponent("Pick which printed edition of each book you're ordering.")}`);
  }

  const totalCents = items.reduce((sum, item) => sum + item.quantity * Math.round(item.unitCost * 100), 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      vendorId,
      status: "SENT",
      expectedAt: expectedAt ? new Date(expectedAt) : null,
      notes: notes ?? null,
      totalCents,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          bookFormat: item.bookFormat ?? null,
          quantityOrdered: item.quantity,
          unitCostCents: Math.round(item.unitCost * 100),
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "purchase_order.created",
      entity: "PurchaseOrder",
      entityId: po.id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/supply/purchase-orders");
  redirect(`/supply/purchase-orders/${po.id}`);
}

// Each "received_<itemId>" field carries the item's new cumulative received
// quantity (not a delta) — the detail page pre-fills it with the current
// value, so only rows the operator actually edits produce a stock change.
export async function receivePurchaseOrderItems(id: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
  if (po.status === "CANCELLED" || po.status === "RECEIVED") {
    redirect(`/supply/purchase-orders/${id}?error=${encodeURIComponent("This purchase order is already closed.")}`);
  }

  const updates: {
    itemId: string;
    productId: string;
    bookFormat: BookFormat | null;
    delta: number;
    newReceived: number;
  }[] = [];
  for (const item of po.items) {
    const raw = formData.get(`received_${item.id}`);
    if (raw == null) continue;
    const parsedValue = Math.round(Number(raw));
    if (!Number.isFinite(parsedValue)) continue;
    const newReceived = Math.max(0, Math.min(item.quantityOrdered, parsedValue));
    if (newReceived === item.quantityReceived) continue;
    updates.push({
      itemId: item.id,
      productId: item.productId,
      bookFormat: item.bookFormat,
      delta: newReceived - item.quantityReceived,
      newReceived,
    });
  }

  if (updates.length === 0) {
    redirect(`/supply/purchase-orders/${id}`);
  }

  // A book line's copies go to the printed edition it was raised for. If
  // that format has since been dropped from the book there's nowhere to
  // put them, so say so rather than inventing stock somewhere else.
  for (const update of updates) {
    if (!update.bookFormat) continue;
    const edition = await prisma.bookEdition.findUnique({
      where: { productId_format: { productId: update.productId, format: update.bookFormat } },
      select: { id: true },
    });
    if (!edition) {
      redirect(
        `/supply/purchase-orders/${id}?error=${encodeURIComponent(
          "A book on this order is no longer sold in the edition it was ordered as. Add that format back to the book first."
        )}`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      await tx.purchaseOrderItem.update({ where: { id: update.itemId }, data: { quantityReceived: update.newReceived } });
      // Not an atomic increment: stockQty is nullable (untracked stock),
      // and `column + delta` on a null column stays null in Postgres.
      if (update.bookFormat) {
        const where = { productId_format: { productId: update.productId, format: update.bookFormat } };
        const edition = await tx.bookEdition.findUniqueOrThrow({ where });
        await tx.bookEdition.update({ where, data: { stockQty: (edition.stockQty ?? 0) + update.delta } });
      } else {
        const product = await tx.product.findUniqueOrThrow({ where: { id: update.productId } });
        await tx.product.update({ where: { id: update.productId }, data: { stockQty: (product.stockQty ?? 0) + update.delta } });
      }
    }

    const freshItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const allReceived = freshItems.every((item) => item.quantityReceived >= item.quantityOrdered);
    const anyReceived = freshItems.some((item) => item.quantityReceived > 0);
    await tx.purchaseOrder.update({
      where: { id },
      data: { status: allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "purchase_order.items_received",
      entity: "PurchaseOrder",
      entityId: id,
      diff: { updates } as unknown as Prisma.InputJsonValue,
    },
  });

  // Received stock changes Product.stockQty, which the storefront caches.
  revalidateStorefront();
  revalidatePath("/supply/purchase-orders");
  revalidatePath(`/supply/purchase-orders/${id}`);
  redirect(`/supply/purchase-orders/${id}`);
}

export async function cancelPurchaseOrder(id: string) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const existing = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
  if (existing.status === "RECEIVED" || existing.status === "CANCELLED") {
    redirect(`/supply/purchase-orders/${id}`);
  }

  await prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "purchase_order.cancelled",
      entity: "PurchaseOrder",
      entityId: id,
      diff: { status: "CANCELLED" },
    },
  });

  revalidatePath("/supply/purchase-orders");
  revalidatePath(`/supply/purchase-orders/${id}`);
  redirect(`/supply/purchase-orders/${id}`);
}
