import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_ORDERS } from "@/lib/sample-data";
import { formatINRWhole } from "@/lib/format";
import {
  Callout,
  SectionHead,
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
  TableWrap,
  buttonClass,
} from "@/components/primitives";

export const metadata: Metadata = { title: "Orders" };

// FR-5.2/FR-8.3: order history with status tracking.
const STATUS: Record<string, { label: string; tone: "ok" | "tile" | "brand" }> = {
  PENDING: { label: "Pending payment", tone: "tile" },
  PAID: { label: "Paid", tone: "brand" },
  PROCESSING: { label: "Processing", tone: "brand" },
  SHIPPED: { label: "Dispatched", tone: "ok" },
  DELIVERED: { label: "Delivered", tone: "ok" },
  READY_FOR_DOWNLOAD: { label: "Ready for download", tone: "ok" },
  CANCELLED: { label: "Cancelled", tone: "tile" },
  REFUNDED: { label: "Refunded", tone: "tile" },
};

export default async function OrderHistoryPage() {
  const user = await getCurrentUser();
  const orders = user
    ? await withFallback(
        () =>
          prisma.order.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            include: { items: true },
          }),
        SAMPLE_ORDERS
      )
    : [];

  return (
    <section>
      <SectionHead title="Orders" href="/account/library" hrefLabel="Digital library" />

      {orders.length === 0 ? (
        <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
          <h3>No orders yet</h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
            Printed editions, e-books and service packages you buy will show up here.
          </p>
          <Link href="/books" className={buttonClass("secondary", "md", "mt-5")}>
            Start browsing
          </Link>
        </div>
      ) : (
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Order</th>
                <th className={TH_CLASS}>Placed</th>
                <th className={TH_CLASS}>Items</th>
                <th className={TH_CLASS}>Total</th>
                <th className={TH_CLASS}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const status = STATUS[order.status] ?? { label: order.status, tone: "tile" as const };
                return (
                  <tr key={order.id}>
                    <td className={`${TD_CLASS} tabular-nums`}>#{order.id.slice(-5)}</td>
                    <td className={TD_CLASS}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className={TD_CLASS}>
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                      {order.trackingNumber && (
                        <span className="block text-xs text-ink-muted">
                          {order.carrier} {order.trackingNumber}
                        </span>
                      )}
                    </td>
                    <td className={`${TD_CLASS} tabular-nums`}>{formatINRWhole(order.totalCents)}</td>
                    <td className={TD_CLASS}>
                      <Callout tone={status.tone}>{status.label}</Callout>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </section>
  );
}
