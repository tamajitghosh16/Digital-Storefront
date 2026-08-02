import { prisma } from "@repo/database";
import { EmptyState, PageHeader, Pill, Table } from "@/components/ui";

// FR-11.2: order dashboard with filtering by status, type, and date.
// Read-only for now — changing an order's status is still to be built.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true },
  });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Orders" description="What customers have bought. Newest first." />

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders appear here as soon as customers start buying." />
      ) : (
        <Table
          head={
            <>
              <th>Order</th>
              <th>Status</th>
              <th>Items</th>
              <th>Total</th>
              <th>Placed</th>
            </>
          }
        >
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="font-mono text-[13px]">#{order.id.slice(-8)}</td>
              <td>
                <Pill tone={order.status === "PAID" ? "info" : "off"}>{order.status}</Pill>
              </td>
              <td className="tabular-nums text-ink-muted">{order.items.length}</td>
              <td className="tabular-nums">{money.format(order.totalCents / 100)}</td>
              <td className="text-ink-muted">{order.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
