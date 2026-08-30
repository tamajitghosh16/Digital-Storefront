import { prisma } from "@repo/database";
import { ButtonLink, PageHeader } from "@/components/ui";
import { PurchaseOrdersList } from "./purchase-orders-list";

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { vendor: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-6xl pt-10">
      <PageHeader
        title="Purchase Orders"
        description="Stock reorders raised against your vendors."
        action={<ButtonLink href="/supply/purchase-orders/new">New purchase order</ButtonLink>}
      />
      <PurchaseOrdersList purchaseOrders={purchaseOrders} />
    </div>
  );
}
