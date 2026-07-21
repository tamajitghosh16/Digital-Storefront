import { prisma } from "@repo/database";

// FR-11.2: order dashboard with filtering by status, type, and date.
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Order</th>
            <th>Status</th>
            <th>Items</th>
            <th>Total</th>
            <th>Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-slate-100">
              <td className="py-2">#{o.id}</td>
              <td>{o.status}</td>
              <td>{o.items.length}</td>
              <td>₹{(o.totalCents / 100).toFixed(2)}</td>
              <td>{o.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
