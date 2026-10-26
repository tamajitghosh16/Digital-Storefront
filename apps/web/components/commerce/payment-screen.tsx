"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Landmark, Smartphone, type LucideIcon } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { Breadcrumb, Callout, CheckList, Rule, Wrap, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { confirmCheckout, placeCodOrder, startCheckout, type CheckoutError, type CheckoutInput } from "@/app/(checkout)/actions";
import type { PricingConfig } from "@/lib/pricing";
import { SummaryLines, cartTotals } from "./order-summary";

/**
 * The payment step: the delivery details from the cart's Checkout section
 * (carried in `useCheckoutStore`), a choice of payment method, and the
 * button that places the order.
 *
 * Cash on delivery goes through `placeCodOrder`. The online methods (UPI,
 * net banking, cards) all open Razorpay Checkout via `startCheckout`, and
 * stay greyed out until Razorpay is configured.
 */

type MethodId = "cod" | "upi" | "netbanking" | "card";

const METHODS: { id: MethodId; label: string; blurb: string; icon: LucideIcon; online: boolean }[] = [
  { id: "cod", label: "Cash on Delivery", blurb: "Pay in cash when your order arrives.", icon: Banknote, online: false },
  { id: "upi", label: "UPI", blurb: "Google Pay, PhonePe, Paytm or any UPI app.", icon: Smartphone, online: true },
  { id: "netbanking", label: "Net Banking", blurb: "All major Indian banks.", icon: Landmark, online: true },
  { id: "card", label: "Debit / Credit cards", blurb: "Visa, Mastercard, RuPay.", icon: CreditCard, online: true },
];

const ERROR_MESSAGES: Record<CheckoutError, string> = {
  SIGN_IN_REQUIRED: "Please sign in again to place your order.",
  NOT_CONFIGURED: "Online payments aren't switched on yet. Please choose Cash on Delivery.",
  EMPTY_CART: "Your cart is empty.",
  INVALID_INPUT:
    "Something in your cart doesn't look right (quantities are limited to 100 per item). Please check it and try again.",
  INVALID_ADDRESS: "Some of your delivery or billing details look incomplete. Please go back and check them.",
  PRODUCT_MISSING: "One of these items is no longer available. Please remove it from your cart and try again.",
  UNAVAILABLE: "One of these items is out of stock or not sold in that format. Please adjust your cart and try again.",
  COD_UNAVAILABLE: "Cash on Delivery is only for printed items. E-books and services need to be paid online.",
  COUPON_INVALID:
    "Your discount code has stopped working since you applied it. Go back to your cart to remove it or try another code.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  GATEWAY_ERROR: "We couldn't start the payment. Please try again.",
};

const noopSubscribe = () => () => {};

export function PaymentScreen({
  pricing,
  paymentsConfigured,
}: {
  pricing: PricingConfig;
  paymentsConfigured: boolean;
}) {
  const router = useRouter();
  const { items, clear: clearCart } = useCartStore();
  const { details, coupon, clear: clearCheckout } = useCheckoutStore();
  // The cart and checkout details live in browser storage, so the server
  // render has neither; wait for the client before deciding what to show.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const totals = useMemo(() => cartTotals(items, pricing, coupon), [items, pricing, coupon]);
  // Mirrors placeCodOrder's rule: anything that unlocks or starts on payment
  // (e-books, services) can't be paid for later.
  const codEligible = items.every((item) => item.fulfillmentType === "SHIP");

  const [method, setMethod] = useState<MethodId | null>(null);
  const selected = method ?? (codEligible ? "cod" : null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isAvailable(id: MethodId): boolean {
    if (id === "cod") return codEligible;
    return paymentsConfigured;
  }

  function checkoutInput(): CheckoutInput | null {
    if (!details) return null;
    return {
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      contact: {
        name: details.name,
        email: details.email,
        line1: details.line1,
        line2: details.line2 || undefined,
        district: details.district,
        city: details.city,
        state: details.state,
        pin: details.pin,
        gst: details.gst || undefined,
      },
      billing: {
        name: details.billing.name,
        line1: details.billing.line1,
        line2: details.billing.line2 || undefined,
        district: details.billing.district,
        city: details.billing.city,
        state: details.billing.state,
        pin: details.billing.pin,
      },
      couponCode: coupon?.code,
    };
  }

  function finish(redirect: string) {
    setPlaced(true);
    clearCart();
    clearCheckout();
    router.push(redirect);
    router.refresh();
  }

  function fail(code: CheckoutError) {
    setSubmitting(false);
    if (code === "SIGN_IN_REQUIRED") {
      router.push("/sign-in?next=/payment");
      return;
    }
    setError(ERROR_MESSAGES[code]);
  }

  async function handlePlaceOrder() {
    const input = checkoutInput();
    if (!input || !selected || !isAvailable(selected) || submitting) return;
    setError(null);
    setSubmitting(true);

    if (selected === "cod") {
      const result = await placeCodOrder(input).catch(() => null);
      if (!result) {
        setSubmitting(false);
        setError("We couldn't place your order. Please check your connection and try again.");
        return;
      }
      if (result.ok) finish(result.redirect);
      else fail(result.error);
      return;
    }

    await payOnline(input, selected);
  }

  async function payOnline(input: CheckoutInput, preferred: Exclude<MethodId, "cod">) {
    const started = await startCheckout(input).catch(() => null);
    if (!started) {
      setSubmitting(false);
      setError(ERROR_MESSAGES.GATEWAY_ERROR);
      return;
    }
    if (!started.ok) {
      fail(started.error);
      return;
    }

    if (typeof window === "undefined" || !window.Razorpay) {
      setSubmitting(false);
      setError("The payment window couldn't load. Check your connection and try again.");
      return;
    }

    const checkout = new window.Razorpay({
      key: started.keyId,
      amount: started.amountCents,
      currency: started.currency,
      order_id: started.razorpayOrderId,
      name: "New School Book Press",
      prefill: { name: details?.name, email: details?.email, method: preferred },
      theme: { color: "#007ACC" },
      handler: async (response) => {
        const confirmed = await confirmCheckout({
          orderId: started.orderId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        if (confirmed.ok) {
          finish(confirmed.redirect);
        } else {
          setSubmitting(false);
          setError(
            "Your payment went through but we couldn't confirm it here. It'll appear in your orders shortly — no need to pay again."
          );
        }
      },
      modal: { ondismiss: () => setSubmitting(false) },
    });
    checkout.open();
  }

  const header = (
    <Wrap>
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Payment" }]} />
      <h1 className="pb-[26px]">Payment</h1>
    </Wrap>
  );

  if (!isClient || placed) {
    return (
      <>
        {header}
        <Wrap className="pb-11">
          <p className="py-7 text-[15px] text-ink-muted">{placed ? "Placing your order…" : "Loading your order…"}</p>
        </Wrap>
      </>
    );
  }

  if (items.length === 0 || !details) {
    return (
      <>
        {header}
        <Wrap className="pb-11">
          <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
            <h3>{items.length === 0 ? "Your cart is empty" : "Delivery details needed"}</h3>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
              {items.length === 0
                ? "Add something to your cart before choosing how to pay."
                : "Fill in where we should deliver, then come back here to pay."}
            </p>
            <Link
              href={items.length === 0 ? "/educational-material/books" : "/cart"}
              className={buttonClass("secondary", "md", "mt-5")}
            >
              {items.length === 0 ? "Browse the catalogue" : "Back to checkout"}
            </Link>
          </div>
        </Wrap>
      </>
    );
  }

  const selectedMethod = METHODS.find((entry) => entry.id === selected);

  return (
    <>
      {paymentsConfigured && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />}
      {header}

      <Wrap className="grid gap-8 pb-11 lg:grid-cols-[1fr_372px] lg:items-start lg:gap-11">
        <div className="min-w-0">
          <section className="rounded-tile bg-tile p-5 inset-ring inset-ring-card-edge">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3>Deliver to</h3>
              <Link href="/cart" className="text-[13px] font-bold underline underline-offset-[3px]">
                Change
              </Link>
            </div>
            <p className="mt-2 text-sm leading-relaxed">
              <span className="font-bold">{details.name}</span>
              <span className="text-ink-muted"> · {details.email}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {details.line1}
              {details.line2 ? `, ${details.line2}` : ""}
              <br />
              {details.city}
              {details.district && details.district !== details.city ? `, ${details.district}` : ""}, {details.state}{" "}
              {details.pin}
            </p>

            <h3 className="mt-5">Bill to</h3>
            {details.billingSameAsShipping ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">Same as delivery address</p>
            ) : (
              <>
                <p className="mt-2 text-sm font-bold leading-relaxed">{details.billing.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {details.billing.line1}
                  {details.billing.line2 ? `, ${details.billing.line2}` : ""}
                  <br />
                  {details.billing.city}
                  {details.billing.district && details.billing.district !== details.billing.city
                    ? `, ${details.billing.district}`
                    : ""}
                  , {details.billing.state} {details.billing.pin}
                </p>
              </>
            )}
            {details.gst && <p className="mt-1 text-sm leading-relaxed text-ink-muted">GSTIN {details.gst}</p>}
          </section>

          <h2 className="mt-9">Payment method</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {paymentsConfigured
              ? "Choose how you'd like to pay."
              : "Online payments are coming soon. For now, orders are paid in cash on delivery."}
          </p>

          <div role="radiogroup" aria-label="Payment method" className="mt-5 grid gap-3">
            {METHODS.map((entry) => {
              const available = isAvailable(entry.id);
              const checked = selected === entry.id;
              const Icon = entry.icon;
              return (
                <label
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-4 rounded-tile border-2 bg-ground p-4 transition-colors",
                    checked ? "border-brand" : "border-line-strong",
                    available ? "cursor-pointer hover:border-ink" : "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={entry.id}
                    checked={checked}
                    disabled={!available}
                    onChange={() => setMethod(entry.id)}
                    className="h-[18px] w-[18px] shrink-0 accent-brand"
                  />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tile">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-bold">
                      {entry.label}
                      {!available && <Callout tone="tile">{entry.online ? "Coming soon" : "Not for this order"}</Callout>}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-muted">
                      {entry.id === "cod" && !codEligible
                        ? "Only for printed items — e-books and services are paid online."
                        : entry.blurb}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <aside className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge lg:sticky lg:top-[68px]">
          <h3>Order summary</h3>

          <ul className="mt-4 grid gap-2 border-b border-line pb-4">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  {item.title}
                  {item.quantity > 1 && <span className="text-ink-muted"> × {item.quantity}</span>}
                  {item.note && <span className="block text-xs text-ink-muted">{item.note}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{formatINRWhole(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <SummaryLines totals={totals} />

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!selected || !isAvailable(selected) || submitting}
            className={buttonClass("primary", "lg", "mt-5 w-full")}
          >
            {submitting
              ? selected === "cod"
                ? "Placing order…"
                : "Opening payment…"
              : selected && selected !== "cod"
                ? `Pay ${formatINRWhole(totals.total)}`
                : "Place order"}
          </button>

          {error && <p className="mt-3 text-xs font-bold text-sale">{error}</p>}

          <p className="mt-3.5 text-xs leading-relaxed text-ink-muted">
            {selectedMethod?.id === "cod"
              ? `Keep ${formatINRWhole(totals.total)} ready in cash for the courier. You'll get a confirmation email once the order is placed.`
              : selectedMethod
                ? "Your order is confirmed only after the payment gateway verifies it — you'll get an email either way."
                : "Choose a payment method to continue."}
          </p>

          <Rule />

          <CheckList
            items={[
              "E-books unlock the moment payment clears",
              "Easy returns on printed copies",
              `Free delivery over ${formatINRWhole(pricing.delivery.freeOverCents)}`,
            ]}
          />
        </aside>
      </Wrap>
    </>
  );
}
