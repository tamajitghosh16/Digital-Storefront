"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Prisma, PurchaseOrderStatus } from "@repo/database";
import { Search } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { EmptyState, Pill, Table, controlClass } from "@/components/ui";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

type PurchaseOrderRow = Prisma.PurchaseOrderGetPayload<{ include: { vendor: true; items: true } }>;

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

export function PurchaseOrdersList({ purchaseOrders }: { purchaseOrders: PurchaseOrderRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return purchaseOrders;
    return purchaseOrders.filter(
      (po) => po.vendor.name.toLowerCase().includes(q) || `po-${String(po.poNumber).padStart(4, "0")}`.includes(q)
    );
  }, [purchaseOrders, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">All Purchase Orders</p>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by vendor or PO number"
            aria-label="Search purchase orders"
            className={cn(controlClass, "w-64 pl-9")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No purchase orders match your search" : "No purchase orders yet"}
          description={
            query ? "Try a different vendor or PO number." : "Raise a purchase order when you need to reorder stock from a vendor."
          }
        />
      ) : (
        <Table
          head={
            <>
              <th>PO number</th>
              <th>Vendor</th>
              <th>Ordered</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </>
          }
        >
          {filtered.map((po) => (
            <tr key={po.id}>
              <td>
                <Link
                  href={`/supply/purchase-orders/${po.id}`}
                  className="font-semibold text-ink hover:text-brand hover:underline"
                >
                  PO-{String(po.poNumber).padStart(4, "0")}
                </Link>
              </td>
              <td className="text-ink-muted">{po.vendor.name}</td>
              <td className="text-ink-muted">{new Date(po.orderedAt).toLocaleDateString("en-IN")}</td>
              <td className="tabular-nums text-ink-muted">{po.items.length}</td>
              <td className="tabular-nums">{money.format(po.totalCents / 100)}</td>
              <td>
                <Pill tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status]}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
