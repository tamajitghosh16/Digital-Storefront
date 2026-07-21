import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { Card, CardContent } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_ORDERS } from "@/lib/sample-data";

const statusVariant = {
  PENDING: "muted",
  PAID: "default",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "success",
  READY_FOR_DOWNLOAD: "success",
  CANCELLED: "accent",
  REFUNDED: "accent",
} as const;

const statusLabel: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  READY_FOR_DOWNLOAD: "Ready for download",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// FR-5.2/FR-8.3: order history with status tracking.
export default async function OrderHistoryPage() {
  const user = await getCurrentUser();
  const orders = user
    ? await withFallback(
        () => prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true } }),
        SAMPLE_ORDERS
      )
    : [];

  return (
    <div>
      <h1 className="font-serif text-xl font-medium text-brand-navy">Order history</h1>

      {orders.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <PackageOpen className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Start browsing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Order #{order.id.slice(-8)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} · {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
                    <span className="text-sm font-semibold text-foreground">₹{(order.totalCents / 100).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
