"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { OrderStatus, PaymentMethod, PaymentStatus, ShipmentStatus } from "@repo/database";
import {
  DELIVERY_TYPE_LABEL,
  SHIPMENT_STATUS_LABEL,
  nextShipmentStatus,
  type DeliveryType,
} from "@repo/database/shipment";
import { Search } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { EmptyState, ErrorBanner, Pill, Table, buttonClass, controlClass } from "@/components/ui";
import { moveSalesOrder } from "./actions";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
// Pinned to IST so the server render and the browser agree on the date.
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export interface SalesOrderAddress {
  name: string;
  email: string;
  line1: string;
  line2: string | null;
  district: string;
  city: string;
  state: string;
  postalCode: string;
}

/** Serializable (ISO dates) — built by page.tsx on the server. */
export interface SalesOrderRow {
  id: string;
  ref: string;
  createdAt: string;
  status: OrderStatus;
  shipmentStatus: ShipmentStatus | null;
  deliveryType: DeliveryType;
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  customer: { name: string | null; email: string | null };
  shippingAddress: SalesOrderAddress | null;
  gstNumber: string | null;
  payment: { method: PaymentMethod | null; status: PaymentStatus } | null;
  items: {
    id: string;
    title: string;
    formatLabel: string | null;
    quantity: number;
    unitPriceCents: number;
    offline: boolean;
  }[];
}

type Filter = "all" | "approval" | "in_progress" | "complete" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All orders" },
  { value: "approval", label: "Waiting for approval" },
  { value: "in_progress", label: "Being delivered" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

/** Which filter bucket an order falls in — the same reading the Current Status column gives it. */
function bucket(order: SalesOrderRow): Exclude<Filter, "all"> {
  if (order.status === "CANCELLED" || order.status === "REFUNDED" || order.shipmentStatus === "CANCELLED") return "cancelled";
  if (order.deliveryType === "ONLINE" || !order.shipmentStatus || order.shipmentStatus === "DELIVERED") return "complete";
  return order.shipmentStatus === "AWAITING_APPROVAL" ? "approval" : "in_progress";
}

/**
 * The Sales Orders table plus its detail pop-up. Clicking a row opens the
 * order; the order number is also a button, so the keyboard has a way in.
 * The Accept / Deny / next-step buttons in the Current Status column work
 * straight from the row without opening it.
 */
export function SalesOrdersList({ orders }: { orders: SalesOrderRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const open = openId ? orders.find((order) => order.id === openId) : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((order) => {
      if (filter !== "all" && bucket(order) !== filter) return false;
      if (!q) return true;
      return (
        order.ref.slice(1).toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        (order.customer.name ?? "").toLowerCase().includes(q) ||
        (order.customer.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, query, filter]);

  const waiting = orders.filter((order) => bucket(order) === "approval").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">
          All Sales Orders
          {waiting > 0 && (
            <span className="ml-2 font-semibold text-ink-muted">
              · {waiting} waiting for approval
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            aria-label="Show orders"
            className={cn(controlClass, "w-52")}
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by order number or customer"
              aria-label="Search sales orders"
              className={cn(controlClass, "w-72 pl-9")}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={query || filter !== "all" ? "No orders match" : "No sales orders yet"}
          description={
            query || filter !== "all"
              ? "Try a different search, or show all orders."
              : "Orders appear here as soon as customers pay online or choose cash on delivery."
          }
        />
      ) : (
        <Table
          head={
            <>
              <th>Order number</th>
              <th>Total price</th>
              <th>Items</th>
              <th>Order placed</th>
              <th>Delivery type</th>
              <th>Current status</th>
            </>
          }
        >
          {filtered.map((order) => (
            <tr key={order.id} onClick={() => setOpenId(order.id)} className="cursor-pointer transition-colors hover:bg-tile">
              <td>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenId(order.id);
                  }}
                  className="font-semibold tabular-nums text-ink hover:text-brand hover:underline"
                >
                  {order.ref}
                  <span className="sr-only"> — view details</span>
                </button>
              </td>
              <td className="tabular-nums">{money.format(order.totalCents / 100)}</td>
              <td className="tabular-nums text-ink-muted">{order.itemCount}</td>
              <td className="text-ink-muted">{dateFormat.format(new Date(order.createdAt))}</td>
              <td className="text-ink-muted">{DELIVERY_TYPE_LABEL[order.deliveryType]}</td>
              <td onClick={(event) => event.stopPropagation()} className="cursor-default">
                <CurrentStatus order={order} onError={setError} />
              </td>
            </tr>
          ))}
        </Table>
      )}

      {open && (
        <SalesOrderDialog
          key={open.id}
          order={open}
          error={error}
          onError={setError}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/**
 * What the Current Status column shows, and the buttons that move the order
 * on. Online-only orders are complete the moment they're paid; an order
 * with printed items waits for Accept / Deny, then walks its steps. A mixed
 * order reads "Partially complete" until its parcel is delivered.
 */
function CurrentStatus({ order, onError }: { order: SalesOrderRow; onError: (message?: string) => void }) {
  const mixed = order.deliveryType === "MIXED";

  if (order.status === "REFUNDED") return <Pill tone="off">Refunded</Pill>;
  if (order.deliveryType === "ONLINE" || !order.shipmentStatus) return <Pill tone="on">Complete</Pill>;
  if (order.status === "CANCELLED" || order.shipmentStatus === "CANCELLED") {
    return (
      <div>
        <Pill tone="off">Cancelled</Pill>
        {mixed && <p className="mt-1 text-xs text-ink-muted">Online items still delivered</p>}
      </div>
    );
  }
  if (order.shipmentStatus === "DELIVERED") return <Pill tone="on">{mixed ? "Complete" : "Delivered"}</Pill>;

  return (
    <div className="space-y-2">
      {mixed && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="info">Partially complete</Pill>
          {order.shipmentStatus !== "AWAITING_APPROVAL" && (
            <span className="text-xs text-ink-muted">Printed items: {SHIPMENT_STATUS_LABEL[order.shipmentStatus]}</span>
          )}
        </div>
      )}
      {!mixed && order.shipmentStatus !== "AWAITING_APPROVAL" && (
        <Pill tone="info">{SHIPMENT_STATUS_LABEL[order.shipmentStatus]}</Pill>
      )}
      <StatusButtons order={order} status={order.shipmentStatus} onError={onError} />
    </div>
  );
}

const smallButton = "px-3 py-1.5 text-[13px]";

function StatusButtons({
  order,
  status,
  onError,
}: {
  order: SalesOrderRow;
  status: ShipmentStatus;
  onError: (message?: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function run(move: "accept" | "deny" | "advance") {
    onError(undefined);
    startTransition(async () => {
      const result = await moveSalesOrder({ orderId: order.id, from: status, move });
      if (!result.ok) onError(result.error);
    });
  }

  if (status === "AWAITING_APPROVAL") {
    const mixed = order.deliveryType === "MIXED";
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run("accept")} className={buttonClass("primary", smallButton)}>
          {pending ? "Saving…" : "Accept"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const message = mixed
              ? `Deny the printed items in order ${order.ref}? They'll be cancelled and their copies put back in stock. The customer keeps their e-book.`
              : `Deny order ${order.ref}? It will be cancelled, its copies put back in stock, and the customer will see it as cancelled.`;
            if (window.confirm(message)) run("deny");
          }}
          className={buttonClass("danger", smallButton)}
        >
          Deny
        </button>
      </div>
    );
  }

  const next = nextShipmentStatus(status);
  if (!next) return null;
  return (
    <button type="button" disabled={pending} onClick={() => run("advance")} className={buttonClass("secondary", smallButton)}>
      {pending ? "Saving…" : `Mark as ${SHIPMENT_STATUS_LABEL[next].toLowerCase()}`}
    </button>
  );
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: "Card",
  UPI: "UPI",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
  OTHER: "Other",
};

function paymentLabel(order: SalesOrderRow): string {
  const payment = order.payment;
  if (!payment) return "No payment recorded";
  const method = payment.method ? PAYMENT_METHOD_LABEL[payment.method] : "Online";
  if (payment.status === "CAPTURED") return `${method} — paid`;
  if (payment.status === "REFUNDED") return `${method} — refunded`;
  if (payment.method === "COD") return order.status === "CANCELLED" ? `${method} — not collected` : `${method} — to be collected`;
  return `${method} — not paid`;
}

function SalesOrderDialog({
  order,
  error,
  onError,
  onClose,
}: {
  order: SalesOrderRow;
  error?: string;
  onError: (message?: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const offline = order.deliveryType !== "ONLINE";
  // Denying an order that was paid online doesn't refund it — there's no
  // refund integration yet, so say what's left to do by hand.
  const refundDue =
    (order.shipmentStatus === "CANCELLED" || order.status === "CANCELLED") && order.payment?.status === "CAPTURED";
  const address = order.shippingAddress;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      aria-labelledby="sales-order-title"
      className="fixed inset-0 m-auto h-fit max-h-[calc(100vh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-ground px-6 py-5">
        <div>
          <h2 id="sales-order-title" className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
            Order {order.ref}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {dateTimeFormat.format(new Date(order.createdAt))} · {DELIVERY_TYPE_LABEL[order.deliveryType]} ·{" "}
            <span className="tabular-nums">{money.format(order.totalCents / 100)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close order details"
          className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-xl text-ink-muted hover:bg-tile hover:text-ink"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className="grid gap-6 px-6 py-6">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Current status</h3>
          <div className="mt-2">
            <CurrentStatus order={order} onError={onError} />
          </div>
          {error && (
            <div className="mt-3">
              <ErrorBanner message={error} />
            </div>
          )}
          {refundDue && (
            <p className="mt-3 rounded-btn border border-line-strong bg-tile px-4 py-3 text-sm text-ink">
              This order was paid online. Refund the customer from your Razorpay dashboard — denying an order doesn&apos;t
              send the money back by itself.
            </p>
          )}
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Customer</h3>
            <p className="mt-2 text-sm font-semibold text-ink">{order.customer.name || "Name not given"}</p>
            {order.customer.email ? (
              <a href={`mailto:${order.customer.email}`} className="text-sm text-brand hover:underline">
                {order.customer.email}
              </a>
            ) : (
              <p className="text-sm text-ink-muted">No email on file</p>
            )}
            <p className="mt-3 text-sm text-ink-muted">{paymentLabel(order)}</p>
            {order.gstNumber && <p className="mt-1 text-sm text-ink-muted">GSTIN {order.gstNumber}</p>}
          </section>

          {offline && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Delivery address</h3>
              {address ? (
                <address className="mt-2 text-sm not-italic leading-relaxed text-ink">
                  {address.name && <span className="block font-semibold">{address.name}</span>}
                  <span className="block">{address.line1}</span>
                  {address.line2 && <span className="block">{address.line2}</span>}
                  <span className="block">
                    {[address.city, address.district].filter(Boolean).join(", ")}
                  </span>
                  <span className="block">
                    {address.state} {address.postalCode}
                  </span>
                </address>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">No delivery address was saved with this order.</p>
              )}
            </section>
          )}
        </div>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Items</h3>
          <ul className="mt-2 divide-y divide-line rounded-tile border border-line-strong">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    {[item.formatLabel, item.offline ? "Offline — ships by courier" : "Online — delivered digitally"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-ink">{money.format((item.unitPriceCents * item.quantity) / 100)}</p>
                  <p className="text-[13px] text-ink-muted">
                    {item.quantity} × {money.format(item.unitPriceCents / 100)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 text-sm [&>div]:flex [&>div]:justify-between [&_dd]:tabular-nums [&_dt]:text-ink-muted">
            <div>
              <dt>Items</dt>
              <dd>{money.format(order.subtotalCents / 100)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div>
                <dt>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                <dd>−{money.format(order.discountCents / 100)}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd>{order.shippingCents ? money.format(order.shippingCents / 100) : "Free"}</dd>
            </div>
            {order.taxCents > 0 && (
              <div>
                <dt>Includes GST</dt>
                <dd>{money.format(order.taxCents / 100)}</dd>
              </div>
            )}
            <div className="border-t border-line pt-2 font-bold">
              <dt className="!text-ink">Total</dt>
              <dd>{money.format(order.totalCents / 100)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </dialog>
  );
}
