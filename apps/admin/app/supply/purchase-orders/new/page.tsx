import { prisma } from "@repo/database";
import { PageHeader } from "@/components/ui";
import { createPurchaseOrder } from "../actions";
import { PurchaseOrderForm } from "../purchase-order-form";

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [vendors, products] = await Promise.all([
    prisma.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { type: "PHYSICAL_BOOK" }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="New purchase order"
        description="Order more stock from a vendor."
        backHref="/supply/purchase-orders"
        backLabel="Purchase Orders"
      />
      <PurchaseOrderForm action={createPurchaseOrder} vendors={vendors} products={products} error={error} />
    </div>
  );
}
