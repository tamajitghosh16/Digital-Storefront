"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { Address } from "@repo/database";
import { Breadcrumb, Callout, CheckList, Rule, Wrap, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { startCheckout, confirmCheckout } from "@/app/(checkout)/actions";
import { createAddress } from "@/lib/actions/addresses";
import {
  deliveryFeeCents,
  deliveryOptions,
  includedGstCents,
  lookupDiscount,
  type DeliverySpeed,
  type PricingConfig,
} from "@/lib/pricing";
import { BookJacket, ProductShot } from "./book-jacket";

/**
 * Cart and checkout on one screen, as the approved design specifies:
 * lines and delivery details on the left, a sticky summary on the right,
 * and payment gated until the delivery details are actually filled in.
 *
 * The summary opens at *list* price so the bundle saving reads as a real
 * deduction rather than a second discount on an already-discounted sum.
 * GST is per line — printed books are nil-rated, services are 18%.
 */

const REQUIRED_FIELDS = ["name", "email", "address", "city", "state", "pin"] as const;
type FieldName = (typeof REQUIRED_FIELDS)[number] | "gst";

/** The address list is server-sorted default-first, but this stays explicit in case that ever changes. */
function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

function addressToFields(address: Address) {
  return {
    address: address.line2 ? `${address.line1}, ${address.line2}` : address.line1,
    city: address.city,
    state: address.state,
    pin: address.postalCode,
  };
}

export function CartScreen({
  pricing,
  isSignedIn,
  paymentsConfigured,
  initialAddresses,
}: {
  pricing: PricingConfig;
  isSignedIn: boolean;
  paymentsConfigured: boolean;
  initialAddresses: Address[];
}) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clear } = useCartStore();
  const speeds = useMemo(() => deliveryOptions(pricing), [pricing]);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(() => pickDefaultAddress(initialAddresses)?.id ?? "");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [addressPromptDone, setAddressPromptDone] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const saveDialogRef = useRef<HTMLDialogElement>(null);

  // Pre-fills from the default saved address (if any) so a returning
  // customer lands on checkout with it already applied, not just offered
  // in a dropdown they might not notice.
  const [fields, setFields] = useState<Record<FieldName, string>>(() => {
    const defaultAddress = pickDefaultAddress(initialAddresses);
    return {
      name: "",
      email: "",
      address: defaultAddress ? addressToFields(defaultAddress).address : "",
      city: defaultAddress?.city ?? "",
      state: defaultAddress?.state ?? "",
      pin: defaultAddress?.postalCode ?? "",
      gst: "",
    };
  });
  const [speed, setSpeed] = useState<DeliverySpeed>("standard");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; rate: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const totals = useMemo(() => {
    let listSubtotal = 0;
    let subtotal = 0;
    let units = 0;
    let gst = 0;

    for (const item of items) {
      const net = item.priceCents * item.quantity;
      listSubtotal += (item.listPriceCents ?? item.priceCents) * item.quantity;
      subtotal += net;
      units += item.quantity;
      gst += includedGstCents(net, item.taxType ?? "PHYSICAL_BOOK", pricing.gstRates);
    }

    const bundleSaving = listSubtotal - subtotal;
    const discount = coupon ? Math.round(subtotal * coupon.rate) : 0;
    const delivery = deliveryFeeCents(pricing, subtotal, speed);

    return {
      listSubtotal,
      subtotal,
      units,
      bundleSaving,
      discount,
      delivery,
      total: subtotal - discount + delivery,
      gst: coupon ? Math.round(gst * (1 - coupon.rate)) : gst,
    };
  }, [items, coupon, speed, pricing]);

  const formValid = REQUIRED_FIELDS.every((name) => {
    const value = fields[name].trim();
    if (!value) return false;
    if (name === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (name === "pin") return /^\d{6}$/.test(value);
    return true;
  });

  const canPay = formValid && items.length > 0;

  useEffect(() => {
    const dialog = saveDialogRef.current;
    if (!dialog) return;
    if (showSavePrompt) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [showSavePrompt]);

  function handlePay() {
    if (!isSignedIn) {
      router.push("/sign-in?next=/cart");
      return;
    }
    if (paying) return;
    // A signed-in shopper with nothing saved yet gets asked once, right at
    // the moment they're about to pay with a real address in hand — rather
    // than a generic prompt on the account page they'd have no reason to
    // visit ahead of time.
    if (addresses.length === 0 && !addressPromptDone) {
      setShowSavePrompt(true);
      return;
    }
    proceedToPayment();
  }

  function handleSaveAddressChoice(save: boolean) {
    setShowSavePrompt(false);
    setAddressPromptDone(true);
    if (!save) {
      proceedToPayment();
      return;
    }
    setSavingAddress(true);
    createAddress({
      line1: fields.address,
      city: fields.city,
      state: fields.state,
      postalCode: fields.pin,
    })
      .then((result) => {
        if (result.ok) setAddresses((prev) => [...prev, result.address]);
      })
      .catch(() => {})
      .finally(() => {
        setSavingAddress(false);
        proceedToPayment();
      });
  }

  async function proceedToPayment() {
    setPayError(null);
    setPaying(true);

    const started = await startCheckout({
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      contact: {
        name: fields.name,
        email: fields.email,
        address: fields.address,
        city: fields.city,
        state: fields.state,
        pin: fields.pin,
        gst: fields.gst || undefined,
      },
      speed,
      couponCode: coupon?.code,
    });

    if (!started.ok) {
      setPaying(false);
      if (started.error === "SIGN_IN_REQUIRED") {
        router.push("/sign-in?next=/cart");
        return;
      }
      setPayError(
        started.error === "NOT_CONFIGURED"
          ? "Card payments aren't switched on yet. Please try again later."
          : started.error === "PRODUCT_MISSING"
            ? "One of these items is no longer available. Please remove it and try again."
            : "We couldn't start the payment. Please try again."
      );
      return;
    }

    if (typeof window === "undefined" || !window.Razorpay) {
      setPaying(false);
      setPayError("The payment window couldn't load. Check your connection and try again.");
      return;
    }

    const checkout = new window.Razorpay({
      key: started.keyId,
      amount: started.amountCents,
      currency: started.currency,
      order_id: started.razorpayOrderId,
      name: "New School Book Press",
      prefill: { name: fields.name, email: fields.email },
      theme: { color: "#007ACC" },
      handler: async (response) => {
        const confirmed = await confirmCheckout({
          orderId: started.orderId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        if (confirmed.ok) {
          clear();
          router.push(confirmed.redirect);
          router.refresh();
        } else {
          setPaying(false);
          setPayError(
            "Your payment went through but we couldn't confirm it here. It'll appear in your orders shortly — no need to pay again."
          );
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    checkout.open();
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      setCouponMessage(null);
      return;
    }
    const match = lookupDiscount(pricing, code);
    if (match) {
      setCoupon({ code, rate: match.rate });
      setCouponMessage({ text: `${code} applied${match.blurb ? ` — ${match.blurb}` : ""}`, ok: true });
    } else {
      // Naming a live code beats a bare rejection, but only if there is one
      // — the Publisher can turn every code off from the admin.
      const suggestion = pricing.discountCodes[0]?.code;
      setCouponMessage({
        text: suggestion
          ? `That code isn't valid on these items. Try ${suggestion}.`
          : "That code isn't valid on these items.",
        ok: false,
      });
      setCoupon(null);
    }
  }

  return (
    <>
      {isSignedIn && paymentsConfigured && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      )}
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        <h1 className="pb-[26px]">Your cart</h1>
      </Wrap>

      <Wrap className="grid gap-8 pb-11 lg:grid-cols-[1fr_372px] lg:items-start lg:gap-11">
        <div className="min-w-0">
          {items.length === 0 ? (
            <p className="py-7 text-[15px] text-ink-muted">
              Your cart is empty.{" "}
              <Link href="/educational-material/books" className="font-bold underline underline-offset-2">
                Browse the catalogue
              </Link>
              .
            </p>
          ) : (
            <div>
              {items.map((item) => {
                const net = item.priceCents * item.quantity;
                const list = (item.listPriceCents ?? item.priceCents) * item.quantity;
                const knownStock = typeof item.stockQty === "number";
                const outOfStock = knownStock && (item.stockQty as number) <= 0;
                const atStockLimit = knownStock && item.quantity >= (item.stockQty as number);
                const lowStock = knownStock && (item.stockQty as number) > 0 && (item.stockQty as number) < 10;
                return (
                  <div
                    key={item.productId}
                    className="grid grid-cols-[76px_1fr_auto] items-start gap-[18px] border-b border-line py-5"
                  >
                    <ProductShot square className="rounded-[10px] p-2.5">
                      <BookJacket title={item.title} className="w-[62%]" sizes="60px" />
                    </ProductShot>

                    <div className="min-w-0">
                      <h3>{item.title}</h3>
                      {item.note && <p className="mt-1 text-[13px] text-ink-muted">{item.note}</p>}
                      {list > net && (
                        <p className="mt-1.5">
                          <Callout>Bundle saving applied</Callout>
                        </p>
                      )}
                      {outOfStock ? (
                        <p className="mt-1.5 text-xs font-bold text-sale">Out of stock</p>
                      ) : (
                        lowStock && (
                          <p className="mt-1.5 text-xs font-bold text-warn">Only {item.stockQty} left in stock</p>
                        )
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3.5">
                        <div className="inline-flex items-center overflow-hidden rounded-full bg-tile">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${item.title}`}
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="grid h-[34px] w-[34px] place-items-center hover:bg-tile-2"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${item.title}`}
                            disabled={outOfStock || atStockLimit}
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="grid h-[34px] w-[34px] place-items-center hover:bg-tile-2 disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-[13px] font-bold text-ink-muted underline underline-offset-[3px] hover:text-sale"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-bold tabular-nums">{formatINRWhole(net)}</p>
                      {list > net && (
                        <p className="text-xs tabular-nums text-ink-subtle line-through">{formatINRWhole(list)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-2.5">
            <label htmlFor="coupon" className="sr-only">
              Discount code
            </label>
            <input
              id="coupon"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              placeholder="Discount code"
              className="h-12 min-w-[190px] flex-1 rounded-full border-2 border-line-strong bg-ground px-5 focus:border-ink focus:outline-none"
            />
            <button type="button" onClick={applyCoupon} className={buttonClass("secondary")}>
              Apply
            </button>
          </div>
          {couponMessage && (
            <p className={cn("mt-2.5 text-sm font-bold", couponMessage.ok ? "text-ok" : "text-sale")}>
              {couponMessage.text}
            </p>
          )}

          <Rule className="my-[34px]" />

          <h2>Delivery &amp; payment</h2>
          <p className="mt-2 text-sm text-ink-muted">Fill these in to unlock payment.</p>

          <div className="mt-5 grid gap-[18px]">
            {isSignedIn && addresses.length > 0 && (
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="cart-saved-address" className="caps text-ink-muted">
                  Use a saved address
                </label>
                <select
                  id="cart-saved-address"
                  value={selectedAddressId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setSelectedAddressId(id);
                    if (!id) {
                      setFields((current) => ({ ...current, address: "", city: "", state: "", pin: "" }));
                      return;
                    }
                    const address = addresses.find((item) => item.id === id);
                    if (!address) return;
                    setFields((current) => ({ ...current, ...addressToFields(address) }));
                  }}
                  className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
                >
                  <option value="">Enter a different address…</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label?.trim() || `${address.line1}, ${address.city}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <Field name="name" label="Full name" placeholder="Ananya Sharma" fields={fields} setFields={setFields} />
              <Field
                name="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                fields={fields}
                setFields={setFields}
              />
            </div>
            <Field
              name="address"
              label="Delivery address"
              placeholder="Flat, building, street"
              fields={fields}
              setFields={setFields}
            />
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <Field name="city" label="City" placeholder="Kolkata" fields={fields} setFields={setFields} />
              <Field name="state" label="State" placeholder="Karnataka" fields={fields} setFields={setFields} />
              <Field
                name="pin"
                label="PIN code"
                placeholder="560001"
                inputMode="numeric"
                fields={fields}
                setFields={setFields}
              />
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="cart-speed" className="caps text-ink-muted">
                Delivery speed
              </label>
              <select
                id="cart-speed"
                value={speed}
                onChange={(event) => setSpeed(event.target.value as DeliverySpeed)}
                className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
              >
                {speeds.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              name="gst"
              label="GST number — optional, for school invoices"
              placeholder="29AAACX0000X1ZX"
              fields={fields}
              setFields={setFields}
            />
          </div>
        </div>

        <aside className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge lg:sticky lg:top-[68px]">
          <h3>Order summary</h3>

          <div className="mt-4">
            <SummaryRow label={`Items (${totals.units}) at list`} value={formatINRWhole(totals.listSubtotal)} />
            {totals.bundleSaving > 0 && (
              <SummaryRow label="Bundle saving" value={`−${formatINRWhole(totals.bundleSaving)}`} good />
            )}
            {totals.discount > 0 && (
              <SummaryRow label="Discount code" value={`−${formatINRWhole(totals.discount)}`} good />
            )}
            <SummaryRow
              label="Delivery"
              value={totals.delivery === 0 ? "Free" : formatINRWhole(totals.delivery)}
            />
            <div className="mt-2.5 flex justify-between gap-3 border-t border-line pt-4 text-xl font-bold tracking-[-0.02em]">
              <span>Total</span>
              <span className="tabular-nums">{formatINRWhole(totals.total)}</span>
            </div>
          </div>

          <p className="mt-2 text-xs text-ink-muted">
            {totals.gst > 0
              ? `Includes ${formatINRWhole(totals.gst)} GST — printed books are nil-rated, services are taxed at 18%.`
              : "No GST on this order — printed books are nil-rated."}
          </p>

          {!isSignedIn ? (
            <button
              type="button"
              onClick={handlePay}
              className={buttonClass("primary", "lg", "mt-5 w-full")}
            >
              Sign in to pay
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={!canPay || !paymentsConfigured || paying}
              className={buttonClass("primary", "lg", "mt-5 w-full")}
            >
              {paying
                ? "Opening payment…"
                : !paymentsConfigured
                  ? "Card payments unavailable"
                  : canPay
                    ? "Pay with Razorpay"
                    : "Continue to delivery"}
            </button>
          )}

          {payError && <p className="mt-3 text-xs font-bold text-sale">{payError}</p>}

          <p className="mt-3.5 text-xs leading-relaxed text-ink-muted">
            {isSignedIn
              ? "Your order is confirmed only after the payment gateway verifies it — you’ll get an email either way."
              : "You’ll need to sign in before paying, so your e-books land in your library."}
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

      <dialog
        ref={saveDialogRef}
        onClose={() => setShowSavePrompt(false)}
        className="fixed inset-0 m-auto h-fit w-[min(28rem,calc(100vw-2rem))] rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="p-6">
          <h3>Save this address?</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Save it to your account so you don&rsquo;t have to type it again next time.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className={buttonClass("secondary")} onClick={() => handleSaveAddressChoice(false)}>
              Not now
            </button>
            <button
              type="button"
              className={buttonClass("primary")}
              disabled={savingAddress}
              onClick={() => handleSaveAddressChoice(true)}
            >
              {savingAddress ? "Saving…" : "Save address"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function SummaryRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2 text-sm">
      <span>{label}</span>
      <span className={cn("tabular-nums", good && "font-bold text-ok")}>{value}</span>
    </div>
  );
}

function Field({
  name,
  label,
  fields,
  setFields,
  type = "text",
  placeholder,
  inputMode,
}: {
  name: FieldName;
  label: string;
  fields: Record<FieldName, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<FieldName, string>>>;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric";
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={`cart-${name}`} className="caps text-ink-muted">
        {label}
      </label>
      <input
        id={`cart-${name}`}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={fields[name]}
        onChange={(event) => setFields((current) => ({ ...current, [name]: event.target.value }))}
        className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
      />
    </div>
  );
}
