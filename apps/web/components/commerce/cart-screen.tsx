"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { Address } from "@repo/database";
import { Breadcrumb, Callout, CheckList, Rule, Wrap, buttonClass } from "@/components/primitives";
import { StateSelect } from "@/components/account/state-select";
import { formatINRWhole } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import {
  useCheckoutStore,
  type AppliedCoupon,
  type BillingDetails,
  type CheckoutDetails,
} from "@/lib/checkout-store";
import { checkCoupon } from "@/app/(checkout)/actions";
import { createAddress } from "@/lib/actions/addresses";
import { getCartStock } from "@/lib/actions/cart";
import { isIndianState } from "@/lib/india-address";
import type { PricingConfig } from "@/lib/pricing";
import { BookJacket, ProductShot } from "./book-jacket";
import { SummaryLines, cartTotals } from "./order-summary";

/**
 * The cart, with the Checkout (delivery and billing details) section under
 * its lines and a sticky summary on the right. "Proceed to payment" stays
 * disabled until the details are filled in, then hands them to /payment (via
 * `useCheckoutStore`), where the shopper picks how to pay.
 *
 * The billing address starts ticked as "same as delivery": its fields then
 * show the delivery address, read-only, and follow it as it's edited.
 * Unticking copies the delivery address in once as a starting point, so only
 * what differs needs typing.
 */

/** The delivery half of `CheckoutDetails` — what the top of the form edits. */
type ShippingFields = Omit<CheckoutDetails, "billingSameAsShipping" | "billing">;
type FieldName = keyof ShippingFields;

const REQUIRED_FIELDS = ["name", "email", "line1", "state", "district", "city", "pin"] as const;
const BILLING_REQUIRED_FIELDS = ["name", "line1", "state", "district", "city", "pin"] as const;
const ADDRESS_FIELDS: FieldName[] = ["line1", "line2", "state", "district", "city", "pin"];

function isFieldValid(name: FieldName, raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (name === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (name === "pin") return /^\d{6}$/.test(value);
  if (name === "state") return isIndianState(value);
  return true;
}

function shippingAsBilling(fields: ShippingFields): BillingDetails {
  const { name, line1, line2, district, city, state, pin } = fields;
  return { name, line1, line2, district, city, state, pin };
}

function trimAll<T extends { [K in keyof T]: string }>(values: T): T {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, (value as string).trim()])) as T;
}

/** The address list is server-sorted default-first, but this stays explicit in case that ever changes. */
function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

function addressToFields(address: Address | null): Pick<CheckoutDetails, "line1" | "line2" | "district" | "city" | "state" | "pin"> {
  return {
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    district: address?.district ?? "",
    city: address?.city ?? "",
    // A free-text state saved before the dropdown existed is left for the
    // shopper to pick, rather than sent as something the server will refuse.
    state: address && isIndianState(address.state) ? address.state : "",
    pin: address?.postalCode ?? "",
  };
}

function addressOptionLabel(address: Address): string {
  const where = `${address.line1}, ${address.city}`;
  return address.label?.trim() ? `${address.label.trim()} — ${where}` : where;
}

export function CartScreen({
  pricing,
  isSignedIn,
  account,
  initialAddresses,
}: {
  pricing: PricingConfig;
  isSignedIn: boolean;
  /** The signed-in customer's own name and email, to pre-fill the form. */
  account: { name: string; email: string };
  initialAddresses: Address[];
}) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, syncStock } = useCartStore();
  const setCheckout = useCheckoutStore((state) => state.setCheckout);

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(() => pickDefaultAddress(initialAddresses)?.id ?? "");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [addressPromptDone, setAddressPromptDone] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const saveDialogRef = useRef<HTMLDialogElement>(null);

  // Name and email come from the account; the address from the default
  // saved one (if any), so a returning customer lands on checkout with it
  // already applied, not just offered in a dropdown they might not notice.
  const [fields, setFields] = useState<ShippingFields>(() => ({
    name: account.name,
    email: account.email,
    ...addressToFields(pickDefaultAddress(initialAddresses)),
    gst: "",
  }));
  const [billingSame, setBillingSame] = useState(true);
  // Only read while `billingSame` is off; until then the billing address is
  // derived from `fields` so it can't fall out of step.
  const [billingFields, setBillingFields] = useState<BillingDetails>(() => shippingAsBilling(fields));
  const billing = billingSame ? shippingAsBilling(fields) : billingFields;
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const totals = useMemo(() => cartTotals(items, pricing, coupon), [items, coupon, pricing]);

  const formValid = REQUIRED_FIELDS.every((name) => isFieldValid(name, fields[name]));
  const billingValid = billingSame || BILLING_REQUIRED_FIELDS.every((name) => isFieldValid(name, billingFields[name]));
  const gstValid = !fields.gst.trim() || /^[0-9A-Z]{15}$/i.test(fields.gst.trim());

  // A line's stock is a snapshot from when it was added, so re-read the
  // shipped lines' live stock on opening the cart and on coming back to the
  // tab — staff may have changed it in apps/admin since. Keyed on the line
  // ids, not `items`, so the sync's own write doesn't trigger another fetch.
  const shipLineKey = items
    .filter((item) => item.fulfillmentType === "SHIP")
    .map((item) => item.productId)
    .sort()
    .join(",");

  useEffect(() => {
    if (!shipLineKey) return;
    let cancelled = false;
    const refresh = () => {
      getCartStock(shipLineKey.split(","))
        .then((stock) => {
          if (!cancelled && stock) syncStock(stock);
        })
        // Display only: checkout re-checks stock itself, so a failed refresh just leaves the snapshot.
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shipLineKey, syncStock]);

  const hasSoldOutLine = items.some(
    (item) => item.fulfillmentType === "SHIP" && typeof item.stockQty === "number" && item.stockQty <= 0
  );

  const canProceed = formValid && billingValid && gstValid && items.length > 0 && !hasSoldOutLine;

  useEffect(() => {
    const dialog = saveDialogRef.current;
    if (!dialog) return;
    if (showSavePrompt) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [showSavePrompt]);

  function updateField(name: FieldName, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    // Once the shopper edits the address it's no longer the saved one they
    // picked, so the dropdown stops claiming it is.
    if (ADDRESS_FIELDS.includes(name)) setSelectedAddressId("");
  }

  function updateBillingField(name: keyof BillingDetails, value: string) {
    setBillingFields((current) => ({ ...current, [name]: value }));
  }

  function toggleBillingSame(same: boolean) {
    if (!same) setBillingFields(shippingAsBilling(fields));
    setBillingSame(same);
  }

  function selectAddress(id: string) {
    setSelectedAddressId(id);
    const address = id ? (addresses.find((item) => item.id === id) ?? null) : null;
    setFields((current) => ({ ...current, ...addressToFields(address) }));
  }

  function handleProceed() {
    if (!isSignedIn) {
      router.push("/sign-in?next=/cart");
      return;
    }
    if (!canProceed) return;
    // A signed-in shopper with nothing saved yet gets asked once, right at
    // the moment they're about to pay with a real address in hand — rather
    // than a generic prompt on the account page they'd have no reason to
    // visit ahead of time.
    if (addresses.length === 0 && !addressPromptDone) {
      setShowSavePrompt(true);
      return;
    }
    goToPayment();
  }

  function handleSaveAddressChoice(save: boolean) {
    setShowSavePrompt(false);
    setAddressPromptDone(true);
    if (!save) {
      goToPayment();
      return;
    }
    setSavingAddress(true);
    createAddress({
      line1: fields.line1,
      line2: fields.line2,
      district: fields.district,
      city: fields.city,
      state: fields.state,
      postalCode: fields.pin,
    })
      .then((result) => {
        if (result.ok) {
          setAddresses((prev) => [...prev, result.address]);
          setSelectedAddressId(result.address.id);
        }
      })
      .catch(() => {})
      .finally(() => {
        setSavingAddress(false);
        goToPayment();
      });
  }

  function goToPayment() {
    const shipping = trimAll(fields);
    setCheckout(
      {
        ...shipping,
        gst: shipping.gst.toUpperCase(),
        billingSameAsShipping: billingSame,
        billing: trimAll(billing),
      },
      coupon
    );
    router.push("/payment");
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      setCouponMessage(null);
      return;
    }
    // Checked on the server: the live code list never reaches the browser,
    // and a wrong guess doesn't hint at a right one.
    setCheckingCoupon(true);
    const result = await checkCoupon(code).catch(() => null);
    setCheckingCoupon(false);
    if (result?.ok) {
      const { blurb, ...terms } = result;
      setCoupon(terms);
      setCouponInput(terms.code);
      setCouponMessage({ text: `${terms.code} applied${blurb ? ` — ${blurb}` : ""}`, ok: true });
    } else {
      setCouponMessage({ text: couponErrorText(result ? result.error : null), ok: false });
      setCoupon(null);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  }

  /** Wires one delivery field to `fields`. */
  const ship = (name: FieldName) => ({
    id: `cart-${name}`,
    value: fields[name],
    onChange: (value: string) => updateField(name, value),
  });
  /** Wires one billing field; read-only while it mirrors the delivery address. */
  const bill = (name: keyof BillingDetails) => ({
    id: `cart-billing-${name}`,
    value: billing[name],
    onChange: (value: string) => updateBillingField(name, value),
    readOnly: billingSame,
  });

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
                            disabled={outOfStock || atStockLimit || item.fulfillmentType === "DIGITAL"}
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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyCoupon();
                }
              }}
              placeholder="Discount code"
              autoComplete="off"
              readOnly={Boolean(coupon)}
              className="h-12 min-w-[190px] flex-1 rounded-full border-2 border-line-strong bg-ground px-5 uppercase placeholder:normal-case focus:border-ink focus:outline-none read-only:bg-tile"
            />
            {coupon ? (
              <button type="button" onClick={removeCoupon} className={buttonClass("secondary")}>
                Remove
              </button>
            ) : (
              <button type="button" onClick={applyCoupon} disabled={checkingCoupon} className={buttonClass("secondary")}>
                {checkingCoupon ? "Checking…" : "Apply"}
              </button>
            )}
          </div>
          {couponMessage && (
            <p className={cn("mt-2.5 text-sm font-bold", couponMessage.ok ? "text-ok" : "text-sale")}>
              {couponMessage.text}
            </p>
          )}

          <Rule className="my-[34px]" />

          <h2>Checkout</h2>
          <p className="mt-2 text-sm text-ink-muted">Where should we deliver? Fill these in to continue to payment.</p>

          <h3 className="mt-7">Delivery address</h3>

          <div className="mt-5 grid gap-[18px]">
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <Field {...ship("name")} label="Full name" placeholder="Ananya Sharma" autoComplete="shipping name" />
              <Field
                {...ship("email")}
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {isSignedIn && (
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="cart-saved-address" className="caps text-ink-muted">
                  Select an address
                </label>
                <select
                  id="cart-saved-address"
                  value={selectedAddressId}
                  onChange={(event) => selectAddress(event.target.value)}
                  className="h-12 w-full min-w-0 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
                >
                  <option value="">
                    {addresses.length === 0 ? "No saved addresses — enter one below" : "Enter a new address…"}
                  </option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {addressOptionLabel(address)}
                    </option>
                  ))}
                </select>
                {addresses.length === 0 && (
                  <p className="text-xs text-ink-muted">
                    Save addresses in{" "}
                    <Link href="/account/details" className="font-bold underline underline-offset-2">
                      Account details
                    </Link>{" "}
                    to pick them here next time.
                  </p>
                )}
              </div>
            )}

            <Field
              {...ship("line1")}
              label="Address line 1"
              placeholder="Flat, building, street"
              autoComplete="shipping address-line1"
            />
            <Field
              {...ship("line2")}
              label="Address line 2 — optional"
              placeholder="Area, landmark"
              autoComplete="shipping address-line2"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <StateSelect
                id="cart-state"
                value={fields.state}
                onChange={(value) => updateField("state", value)}
                autoComplete="shipping address-level1"
              />
              <Field {...ship("district")} label="District" placeholder="Kolkata" />
              <Field {...ship("city")} label="City" placeholder="Kolkata" autoComplete="shipping address-level2" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                {...ship("pin")}
                label="PIN code"
                placeholder="700001"
                inputMode="numeric"
                autoComplete="shipping postal-code"
              />
            </div>
          </div>

          <h3 className="mt-9">Billing address</h3>
          <p className="mt-2 text-sm text-ink-muted">The name and address your invoice is made out to.</p>

          <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 text-[15px] font-bold">
            <input
              type="checkbox"
              checked={billingSame}
              onChange={(event) => toggleBillingSame(event.target.checked)}
              className="h-[18px] w-[18px] shrink-0 accent-brand"
            />
            Billing address is the same as my delivery address
          </label>

          <div className="mt-5 grid gap-[18px]">
            <Field
              {...bill("name")}
              label="Name on invoice"
              placeholder="Your name or institution"
              autoComplete="billing name"
            />
            <Field
              {...bill("line1")}
              label="Address line 1"
              placeholder="Flat, building, street"
              autoComplete="billing address-line1"
            />
            <Field
              {...bill("line2")}
              label="Address line 2 — optional"
              placeholder="Area, landmark"
              autoComplete="billing address-line2"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <StateSelect
                id="cart-billing-state"
                value={billing.state}
                onChange={(value) => updateBillingField("state", value)}
                disabled={billingSame}
                autoComplete="billing address-level1"
              />
              <Field {...bill("district")} label="District" placeholder="Kolkata" />
              <Field {...bill("city")} label="City" placeholder="Kolkata" autoComplete="billing address-level2" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                {...bill("pin")}
                label="PIN code"
                placeholder="700001"
                inputMode="numeric"
                autoComplete="billing postal-code"
              />
              <Field {...ship("gst")} label="GST number — optional" placeholder="29AAACX0000X1ZX" />
            </div>
            {!gstValid && <p className="-mt-2 text-xs font-bold text-sale">A GST number is 15 letters and digits.</p>}
          </div>
        </div>

        <aside className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge lg:sticky lg:top-[68px]">
          <h3>Order summary</h3>

          <SummaryLines totals={totals} />

          <button
            type="button"
            onClick={handleProceed}
            disabled={isSignedIn && !canProceed}
            className={buttonClass("primary", "lg", "mt-5 w-full")}
          >
            {isSignedIn ? "Proceed to payment" : "Sign in to check out"}
          </button>

          <p className="mt-3.5 text-xs leading-relaxed text-ink-muted">
            {!isSignedIn
              ? "You’ll need to sign in before paying, so your e-books land in your library."
              : canProceed
                ? "You’ll choose how to pay on the next step."
                : items.length === 0
                  ? "Your cart is empty."
                  : hasSoldOutLine
                    ? "Remove the out-of-stock items to continue."
                    : "Fill in your delivery and billing details to continue."}
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

function Field({
  id,
  label,
  value,
  onChange,
  readOnly,
  type = "text",
  placeholder,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric";
  autoComplete?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <label htmlFor={id} className="caps text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={readOnly ? undefined : placeholder}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full min-w-0 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none read-only:bg-tile"
      />
    </div>
  );
}

function couponErrorText(error: "INVALID" | "EXPIRED" | "USED_UP" | "CUSTOMER_LIMIT" | "RATE_LIMITED" | null): string {
  switch (error) {
    case "RATE_LIMITED":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "EXPIRED":
      return "That code has ended.";
    case "USED_UP":
      return "That code has been fully used.";
    case "CUSTOMER_LIMIT":
      return "You've already used that code.";
    case "INVALID":
      return "That code isn't valid.";
    default:
      return "We couldn't check that code. Please try again.";
  }
}
