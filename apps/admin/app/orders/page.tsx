import Link from "next/link";
import { prisma, type OrderStatus } from "@repo/database";
import { cn } from "@repo/ui/utils";
import { EmptyState, PageHeader, Pill, Table } from "@/components/ui";
import { requireStaffPage } from "@/lib/guard";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  orderRef,
  orderStatusTone,
  paymentStatusLabel,
} from "./order-status";

// FR-11.2: order dashboard with filtering by status. Each row opens the
// order's own page (./[id]), where staff move it along.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** "To do" is everything waiting on staff to send it: paid online, or COD (which starts at PROCESSING). */
const TO_DO: OrderStatus[] = ["PAID", "PROCESSING"];

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "TO_DO", label: "To do" },
  ...(["SHIPPED", "DELIVERED", "PENDING", "CANCELLED", "REFUNDED"] as const).map((status) => ({
    value: status,
    label: ORDER_STATUS_LABEL[status],
  })),
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage();
  const { status } = await searchParams;
  // Only "TO_DO" or a real OrderStatus reaches the query; anything else means "all".
  const single = ORDER_STATUSES.find((value) => value === status);
  const active = status === "TO_DO" ? "TO_DO" : (single ?? "");
  const orders = await prisma.order.findMany({
    where: active === "TO_DO" ? { status: { in: TO_DO } } : single ? { status: single } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { select: { quantity: true } }, payment: { select: { method: true, status: true } } },
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Orders"
        description="What customers have bought, newest first. Open an order to pack it, ship it and mark it delivered."
      />

      <nav aria-label="Filter orders" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/orders?status=${filter.value}` : "/orders"}
            aria-current={active === filter.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active === filter.value
                ? "border-ink bg-ink text-white"
                : "border-line-strong text-ink-muted hover:border-ink hover:text-ink"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title={active ? "No orders here" : "No orders yet"}
          description={
            active ? "Nothing matches this filter right now." : "Orders appear here as soon as customers start buying."
          }
        />
      ) : (
        <Table
          head={
            <>
              <th>Order</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Items</th>
              <th>Total</th>
              <th>Placed</th>
            </>
          }
        >
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link href={`/orders/${order.id}`} className="font-mono text-[13px] font-semibold text-brand hover:underline">
                  {orderRef(order.id)}
                </Link>
              </td>
              <td>
                <Pill tone={orderStatusTone(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Pill>
              </td>
              <td className="text-ink-muted">
                {order.payment
                  ? `${order.payment.method ? `${PAYMENT_METHOD_LABEL[order.payment.method]} · ` : ""}${paymentStatusLabel(order.payment.status, order.payment.method).toLowerCase()}`
                  : "—"}
              </td>
              <td className="tabular-nums text-ink-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
              <td className="tabular-nums">{money.format(order.totalCents / 100)}</td>
              <td className="text-ink-muted">{day.format(order.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
