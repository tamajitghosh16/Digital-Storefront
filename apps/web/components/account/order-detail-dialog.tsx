"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Callout, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import {
  ORDER_STATUS,
  PAYMENT_METHOD_LABEL,
  buildTrackingTimeline,
  carrierTrackingUrl,
  formatOrderDate,
  formatOrderDateTime,
  shipsPhysically,
  type OrderDetail,
  type TrackingStep,
} from "@/lib/order-tracking";
import type { OrderShippingAddress } from "@/lib/india-address";

/**
 * The "My Orders" detail pop-up: tracking timeline, courier details, the
 * lines bought, the price breakdown, payment, delivery and billing address.
 *
 * Same native-<dialog> pattern as `address-dialog.tsx`: the caller mounts
 * it only while an order is selected and it opens itself on mount, so
 * there's no `open` prop to keep in sync.
 */
export function OrderDetailDialog({
  order,
  standardEta,
  onClose,
}: {
  order: OrderDetail;
  /** The admin-managed delivery promise — "in 3-5 working days". */
  standardEta: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function requestClose() {
    dialogRef.current?.close();
  }

  const status = ORDER_STATUS[order.status];
  const steps = buildTrackingTimeline(order, standardEta);
  const physical = shipsPhysically(order);
  // Orders from before checkout asked for a billing address were billed to
  // the delivery one.
  const billingAddress = order.billingAddress ?? order.shippingAddress;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasEbook = order.items.some((item) => item.includesEbook);
  const ebookReady = hasEbook && !["PENDING", "CANCELLED", "REFUNDED"].includes(order.status);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself; anything
      // inside lands on a child.
      onClick={(event) => event.target === event.currentTarget && requestClose()}
      aria-labelledby="order-detail-title"
      className="fixed inset-0 m-auto h-fit w-[min(44rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-ground px-6 py-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="order-detail-title" className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
              Order {order.ref}
            </h2>
            <Callout tone={status.tone}>{status.label}</Callout>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {formatOrderDateTime(order.createdAt)} · {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
            <span className="tabular-nums">{formatINRWhole(order.totalCents)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close order details"
          className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-xl text-ink-muted hover:bg-tile hover:text-ink"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className="grid gap-7 px-6 py-6">
        <section aria-labelledby="order-tracking-heading">
          <h3 id="order-tracking-heading" className="caps text-ink-muted">
            Tracking
          </h3>
          <Timeline steps={steps} />

          {physical && order.trackingNumber && (
            <CourierCard carrier={order.carrier} trackingNumber={order.trackingNumber} />
          )}

          {hasEbook && (
            <p className="mt-4 rounded-tile bg-tile px-4 py-3 text-sm text-ink-muted inset-ring inset-ring-card-edge">
              {ebookReady ? (
                <>
                  Your e-book is ready.{" "}
                  <Link href="/account/library" className="font-bold text-ink underline underline-offset-2">
                    Open your digital library
                  </Link>
                </>
              ) : order.status === "PENDING" ? (
                "Your e-book unlocks in your digital library as soon as payment is confirmed."
              ) : (
                "E-book access ended with this order."
              )}
            </p>
          )}
        </section>

        <section aria-labelledby="order-items-heading">
          <h3 id="order-items-heading" className="caps text-ink-muted">
            Items
          </h3>
          <ul className="mt-3 divide-y divide-line rounded-tile bg-tile inset-ring inset-ring-card-edge">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 px-4 py-3.5">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[6px] bg-tile-2">
                  {item.coverImageUrl && (
                    <Image src={item.coverImageUrl} alt="" fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link href={item.href} className="font-bold leading-snug hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="font-bold leading-snug">{item.title}</p>
                  )}
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    {[item.author, item.formatLabel].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-muted tabular-nums">
                    {item.quantity} × {formatINRWhole(item.unitPriceCents)}
                  </p>
                </div>
                <p className="shrink-0 font-bold tabular-nums">
                  {formatINRWhole(item.quantity * item.unitPriceCents)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-7 sm:grid-cols-2">
          <section aria-labelledby="order-payment-heading">
            <h3 id="order-payment-heading" className="caps text-ink-muted">
              Payment
            </h3>
            <dl className="mt-3 grid gap-1.5 text-sm">
              <Row label="Subtotal" value={formatINRWhole(order.subtotalCents)} />
              {order.discountCents > 0 && (
                <Row
                  label={order.discountCode ? `Discount (${order.discountCode})` : "Discount"}
                  value={`− ${formatINRWhole(order.discountCents)}`}
                  className="text-ok"
                />
              )}
              {physical && (
                <Row
                  label="Delivery"
                  value={order.shippingCents > 0 ? formatINRWhole(order.shippingCents) : "Free"}
                />
              )}
              {order.taxCents > 0 && <Row label="GST" value={formatINRWhole(order.taxCents)} />}
              <Row
                label="Total"
                value={formatINRWhole(order.totalCents)}
                className="mt-1.5 border-t border-line pt-2.5 text-base font-bold text-ink"
              />
            </dl>
            {order.payment && (
              <p className="mt-3 text-sm text-ink-muted">
                {order.payment.method ? PAYMENT_METHOD_LABEL[order.payment.method] : "Online payment"} ·{" "}
                {paymentStatusLabel(order)}
              </p>
            )}
          </section>

          {physical && order.shippingAddress && (
            <section aria-labelledby="order-address-heading">
              <h3 id="order-address-heading" className="caps text-ink-muted">
                Delivering to
              </h3>
              <AddressLines address={order.shippingAddress} />
            </section>
          )}

          {billingAddress && (
            <section aria-labelledby="order-billing-heading">
              <h3 id="order-billing-heading" className="caps text-ink-muted">
                {physical ? "Billed to" : "Billing details"}
              </h3>
              {physical && order.shippingAddress && sameAddress(billingAddress, order.shippingAddress) ? (
                <p className="mt-3 text-sm text-ink-muted">Same as delivery address</p>
              ) : (
                <AddressLines address={billingAddress} />
              )}
              {order.gstNumber && <p className="mt-2 text-sm text-ink-muted">GSTIN {order.gstNumber}</p>}
            </section>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
        <p className="text-[13px] text-ink-muted">Need help? Quote order {order.ref} when you contact us.</p>
        <button type="button" className={buttonClass("secondary", "sm")} onClick={requestClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}

function AddressLines({ address }: { address: OrderShippingAddress }) {
  return (
    <address className="mt-3 text-sm not-italic leading-relaxed">
      <span className="font-bold">{address.name}</span>
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {address.city}, {address.district}
      <br />
      {address.state} {address.postalCode}
      <br />
      <span className="text-ink-muted">{address.email}</span>
    </address>
  );
}

function sameAddress(a: OrderShippingAddress, b: OrderShippingAddress): boolean {
  return (["name", "line1", "line2", "district", "city", "state", "postalCode"] as const).every(
    (key) => (a[key] ?? "") === (b[key] ?? "")
  );
}

function Timeline({ steps }: { steps: TrackingStep[] }) {
  return (
    <ol className="mt-4">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-7 bottom-1 w-0.5 rounded-full",
                  step.state === "done" ? "bg-ok" : "bg-line-strong"
                )}
              />
            )}
            <StepMarker state={step.state} />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p
                  className={cn(
                    "font-bold leading-snug",
                    step.state === "upcoming" && "text-ink-muted",
                    step.state === "stopped" && "text-sale"
                  )}
                >
                  {step.label}
                  <span className="sr-only"> — {STATE_LABEL[step.state]}</span>
                </p>
                {step.at && (
                  <time dateTime={step.at} className="text-[13px] text-ink-muted tabular-nums">
                    {step.state === "current" ? `Updated ${formatOrderDate(step.at)}` : formatOrderDateTime(step.at)}
                  </time>
                )}
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const STATE_LABEL: Record<TrackingStep["state"], string> = {
  done: "completed",
  current: "in progress",
  upcoming: "not yet",
  stopped: "stopped",
};

function StepMarker({ state }: { state: TrackingStep["state"] }) {
  if (state === "done") {
    return (
      <span aria-hidden className="relative z-[1] grid size-6 shrink-0 place-items-center rounded-full bg-ok text-[13px] font-bold text-white dark:text-[#06231b]">
        ✓
      </span>
    );
  }
  if (state === "stopped") {
    return (
      <span aria-hidden className="relative z-[1] grid size-6 shrink-0 place-items-center rounded-full bg-sale text-[13px] font-bold text-white dark:text-[#2a0a06]">
        ✕
      </span>
    );
  }
  if (state === "current") {
    return (
      <span aria-hidden className="relative z-[1] grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft">
        <span className="size-2.5 rounded-full bg-brand motion-safe:animate-pulse" />
      </span>
    );
  }
  return <span aria-hidden className="relative z-[1] size-6 shrink-0 rounded-full border-2 border-line-strong bg-ground" />;
}

function CourierCard({ carrier, trackingNumber }: { carrier: string | null; trackingNumber: string }) {
  const [copied, setCopied] = useState(false);
  const trackUrl = carrierTrackingUrl(carrier, trackingNumber);

  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permissions) — the number is
      // on screen to select by hand.
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-tile bg-tile px-4 py-3.5 inset-ring inset-ring-card-edge">
      <div className="min-w-0">
        <p className="caps text-ink-muted">{carrier || "Courier"}</p>
        <p className="mt-0.5 font-bold tabular-nums break-all">{trackingNumber}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={buttonClass("ghost", "sm")} aria-live="polite">
          {copied ? "Copied" : "Copy number"}
        </button>
        {trackUrl && (
          <a href={trackUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
            Track parcel
            <span className="sr-only"> on {carrier} (opens in a new tab)</span>
            <span aria-hidden>↗</span>
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-4 text-ink-muted", className)}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function paymentStatusLabel(order: OrderDetail): string {
  const payment = order.payment!;
  if (payment.method === "COD") {
    if (payment.status === "CAPTURED") return "Collected";
    if (order.status === "CANCELLED") return "Not collected";
    return `Pay ${formatINRWhole(order.totalCents)} on delivery`;
  }
  switch (payment.status) {
    case "CAPTURED":
      return `Paid ${formatOrderDate(payment.updatedAt)}`;
    case "AUTHORIZED":
      return "Authorised — awaiting capture";
    case "FAILED":
      return "Payment failed";
    case "REFUNDED":
      return `Refunded ${formatOrderDate(payment.updatedAt)}`;
    default:
      return "Awaiting payment";
  }
}
