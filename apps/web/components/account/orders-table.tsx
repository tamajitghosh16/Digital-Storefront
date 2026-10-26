"use client";
import { useState } from "react";
import { Callout, TABLE_CLASS, TD_CLASS, TH_CLASS, TableWrap, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { ORDER_STATUS, formatOrderDate, type OrderDetail } from "@/lib/order-tracking";
import { OrderDetailDialog } from "./order-detail-dialog";

/**
 * The "My Orders" table plus its detail pop-up. Clicking anywhere on a row
 * opens the order; the "View details" button is the keyboard/screen-reader
 * route to the same thing, so the row's click handler is only a mouse
 * convenience.
 */
export function OrdersTable({
  orders,
  justPlacedId,
  standardEta,
}: {
  orders: OrderDetail[];
  justPlacedId?: string;
  standardEta: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? orders.find((order) => order.id === openId) : undefined;
  const justPlaced = justPlacedId ? orders.find((order) => order.id === justPlacedId) : undefined;

  return (
    <>
      {justPlaced && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-tile bg-tile p-5 inset-ring inset-ring-card-edge"
        >
          <div>
            <p className="font-bold text-ok">Order {justPlaced.ref} placed — thank you!</p>
            <p className="mt-1 text-sm text-ink-muted">
              {justPlaced.payment?.method === "COD"
                ? `Please keep ${formatINRWhole(justPlaced.totalCents)} ready in cash for the courier. We'll email you when it ships.`
                : "We'll email you when it ships."}
            </p>
          </div>
          <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setOpenId(justPlaced.id)}>
            Track this order
          </button>
        </div>
      )}

      {/* `relative` makes the scroller the containing block for the sr-only
          labels in the last column — otherwise they escape its overflow
          clip and widen the whole page on phones. */}
      <TableWrap className="relative">
        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              <th className={TH_CLASS}>Order</th>
              <th className={TH_CLASS}>Placed</th>
              <th className={TH_CLASS}>Items</th>
              <th className={TH_CLASS}>Total</th>
              <th className={TH_CLASS}>Status</th>
              <th className={TH_CLASS}>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = ORDER_STATUS[order.status];
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <tr
                  key={order.id}
                  onClick={() => setOpenId(order.id)}
                  className="cursor-pointer transition-colors hover:bg-tile-2"
                >
                  <td className={`${TD_CLASS} font-bold tabular-nums`}>{order.ref}</td>
                  <td className={TD_CLASS}>{formatOrderDate(order.createdAt)}</td>
                  <td className={TD_CLASS}>
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                    {order.trackingNumber && (
                      <span className="block text-xs text-ink-muted">
                        {order.carrier} {order.trackingNumber}
                      </span>
                    )}
                  </td>
                  <td className={`${TD_CLASS} tabular-nums`}>{formatINRWhole(order.totalCents)}</td>
                  <td className={TD_CLASS}>
                    <Callout tone={status.tone}>{status.label}</Callout>
                    {order.payment?.method === "COD" && (
                      <span className="mt-1 block text-xs text-ink-muted">Cash on delivery</span>
                    )}
                  </td>
                  <td className={`${TD_CLASS} text-right`}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenId(order.id);
                      }}
                      className={buttonClass("ghost", "sm", "whitespace-nowrap")}
                    >
                      View details
                      <span className="sr-only"> for order {order.ref}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      {open && (
        <OrderDetailDialog key={open.id} order={open} standardEta={standardEta} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
