import { notFound } from "next/navigation";
import { prisma, type PurchaseOrderStatus } from "@repo/database";
import { PageHeader, Pill, Section, Table } from "@/components/ui";
import { ConfirmButton, SaveButton } from "@/components/form-controls";
import { cancelPurchaseOrder, receivePurchaseOrderItems } from "../actions";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

const STATUS_TONE: Record<PurchaseOrderStatus, "on" | "off" | "info"> = {
  DRAFT: "off",
  SENT: "info",
  PARTIALLY_RECEIVED: "info",
  RECEIVED: "on",
  CANCELLED: "off",
};

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export default async function PurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { vendor: true, items: { include: { product: true } } },
  });
  if (!po) notFound();

  const isOpen = po.status !== "RECEIVED" && po.status !== "CANCELLED";

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`PO-${String(po.poNumber).padStart(4, "0")}`}
        description={`Raised against ${po.vendor.name}, ordered ${new Date(po.orderedAt).toLocaleDateString("en-IN")}.`}
        backHref="/supply/purchase-orders"
        backLabel="Purchase Orders"
        action={<Pill tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status]}</Pill>}
      />

      {error && <p className="mb-4 text-sm font-semibold text-warn">{error}</p>}

      <Section title="Items" description={isOpen ? "Update how many copies of each item you've received." : "What was ordered."}>
        <form action={receivePurchaseOrderItems.bind(null, po.id)}>
          <Table
            head={
              <>
                <th>Book</th>
                <th>Ordered</th>
                <th>Cost per copy</th>
                <th>Received</th>
              </>
            }
          >
            {po.items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium text-ink">{item.product.title}</td>
                <td className="tabular-nums text-ink-muted">{item.quantityOrdered}</td>
                <td className="tabular-nums text-ink-muted">{money.format(item.unitCostCents / 100)}</td>
                <td className="tabular-nums">
                  {isOpen ? (
                    <input
                      type="number"
                      name={`received_${item.id}`}
                      min={0}
                      max={item.quantityOrdered}
                      defaultValue={item.quantityReceived}
                      className="w-20 rounded-btn border border-line bg-ground px-2 py-1.5 text-sm text-ink"
                    />
                  ) : (
                    item.quantityReceived
                  )}
                </td>
              </tr>
            ))}
          </Table>
          {isOpen && (
            <div className="mt-4">
              <SaveButton pendingLabel="Saving…">Save received quantities</SaveButton>
            </div>
          )}
        </form>
      </Section>

      <div className="mt-5 flex items-center justify-between rounded-tile border border-line-strong bg-ground p-5">
        <p className="text-sm font-bold text-ink">Order total: {money.format(po.totalCents / 100)}</p>
        {isOpen && (
          <form action={cancelPurchaseOrder.bind(null, po.id)}>
            <ConfirmButton message="Cancel this purchase order? This can't be undone.">Cancel purchase order</ConfirmButton>
          </form>
        )}
      </div>

      {po.notes && (
        <div className="mt-5">
          <Section title="Notes">
            <p className="whitespace-pre-line text-sm text-ink-muted">{po.notes}</p>
          </Section>
        </div>
      )}
    </div>
  );
}
