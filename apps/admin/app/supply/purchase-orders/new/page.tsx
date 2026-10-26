import { prisma } from "@repo/database";
import type { PurchasableOption } from "../purchase-order-form";
import { PageHeader } from "@/components/ui";
import { createPurchaseOrder } from "../actions";
import { PurchaseOrderForm } from "../purchase-order-form";
import { requireStaffPage } from "@/lib/guard";

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaffPage();
  const { error } = await searchParams;
  const [vendors, products] = await Promise.all([
    prisma.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { type: "PHYSICAL_BOOK" },
      // Postgres orders an enum by declaration: Paperback, then Hardcover.
      include: { editions: { where: { format: { in: ["PAPERBACK", "HARDCOVER"] } }, orderBy: { format: "asc" } } },
      orderBy: { title: "asc" },
    }),
  ]);

  // A book is stocked per printed edition, so it's offered once per
  // edition ("… — Paperback", "… — Hardcover"); anything else once.
  const options: PurchasableOption[] = products.flatMap((product) =>
    product.editions.length
      ? product.editions.map((edition) => ({
          value: `${product.id}:${edition.format}`,
          label: `${product.title} — ${edition.format === "PAPERBACK" ? "Paperback" : "Hardcover"}`,
        }))
      : product.productLine === "BOOK"
        ? []
        : [{ value: product.id, label: product.title }]
  );

  return (
    <div>
      <PageHeader
        title="New purchase order"
        description="Order more stock from a vendor."
        backHref="/supply/purchase-orders"
        backLabel="Purchase Orders"
      />
      <PurchaseOrderForm action={createPurchaseOrder} vendors={vendors} options={options} error={error} />
    </div>
  );
}
