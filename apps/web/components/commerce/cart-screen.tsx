"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { Breadcrumb, Callout, CheckList, Rule, Wrap, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
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

export function CartScreen({ pricing }: { pricing: PricingConfig }) {
  const { items, removeItem, updateQuantity } = useCartStore();
  const speeds = useMemo(() => deliveryOptions(pricing), [pricing]);

  const [fields, setFields] = useState<Record<FieldName, string>>({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pin: "",
    gst: "",
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
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        <h1 className="pb-[26px]">Your cart</h1>
      </Wrap>

      <Wrap className="grid gap-8 pb-11 lg:grid-cols-[1fr_372px] lg:items-start lg:gap-11">
        <div className="min-w-0">
          {items.length === 0 ? (
            <p className="py-7 text-[15px] text-ink-muted">
              Your cart is empty.{" "}
              <Link href="/books" className="font-bold underline underline-offset-2">
                Browse the catalogue
              </Link>
              .
            </p>
          ) : (
            <div>
              {items.map((item) => {
                const net = item.priceCents * item.quantity;
                const list = (item.listPriceCents ?? item.priceCents) * item.quantity;
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
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="grid h-[34px] w-[34px] place-items-center hover:bg-tile-2"
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

          <button
            type="button"
            disabled={!canPay}
            className={buttonClass("primary", "lg", "mt-5 w-full")}
          >
            {canPay ? "Pay with Razorpay" : "Continue to delivery"}
          </button>

          <p className="mt-3.5 text-xs leading-relaxed text-ink-muted">
            Your order is confirmed only after the payment gateway verifies it — you&rsquo;ll get an email either way.
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
