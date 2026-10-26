"use client";

import { useRef, useState } from "react";
import { buttonClass, CheckboxField, Field, FieldRow, MoneyField, TextAreaField, TextField, controlClass } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";
import { createDiscountCode } from "./actions";

type DiscountType = "PERCENT" | "FLAT";

/**
 * "Add new Coupon" → a modal with the new-code form, same pattern as the
 * other "Add new …" dialogs. The type is picked first and only the fields
 * that apply to it show (a cap only makes sense on a percentage). On submit
 * the Server Action redirects back here, so a validation error surfaces in
 * the page-level banner and the dialog closes.
 */
export function AddDiscountDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<DiscountType>("PERCENT");
  const [code, setCode] = useState("");

  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => dialogRef.current?.showModal()}>
        Add new Coupon
      </button>

      <dialog
        ref={dialogRef}
        className="max-h-[calc(100vh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
      >
        <form action={createDiscountCode} className="p-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">New coupon code</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Shoppers type this code in their cart to get money off. It takes the discount off the items, before
            delivery.
          </p>

          <div className="mt-5 space-y-4">
            <TextField
              label="Coupon code"
              help="What shoppers type. Letters, numbers and hyphens only — it isn't case-sensitive."
              name="code"
              required
              autoComplete="off"
              maxLength={24}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="DIWALI10"
              className={`${controlClass} font-mono uppercase`}
            />

            <Field label="Type of discount" required>
              <div className="grid gap-2 sm:grid-cols-2">
                <TypeChoice
                  value="PERCENT"
                  current={type}
                  onChange={setType}
                  title="Percentage off"
                  body="e.g. 10% off the items"
                />
                <TypeChoice
                  value="FLAT"
                  current={type}
                  onChange={setType}
                  title="Fixed amount off"
                  body="e.g. ₹100 off the items"
                />
              </div>
            </Field>

            <FieldRow>
              {type === "PERCENT" ? (
                <Field label="Discount" help="How much comes off, as a percentage." htmlFor="value" required>
                  <div className="flex items-center rounded-btn border border-line bg-ground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
                    <input
                      id="value"
                      name="value"
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      required
                      placeholder="10"
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-ink focus:outline-none"
                    />
                    <span className="pr-3 text-sm font-semibold text-ink-muted" aria-hidden>
                      %
                    </span>
                  </div>
                </Field>
              ) : (
                <MoneyField label="Discount" help="How much comes off, in rupees." name="value" required />
              )}
              {type === "PERCENT" ? (
                <MoneyField
                  label="Maximum discount"
                  help="The most one order can save. Leave empty for no cap."
                  name="maxDiscount"
                />
              ) : (
                <div />
              )}
              <MoneyField
                label="Minimum order"
                help="The items must add up to at least this much. Leave empty for any order."
                name="minOrder"
              />
              <div />
              <TextField
                label="Starts on"
                help="Leave empty to start straight away."
                name="startsOn"
                type="date"
              />
              <TextField
                label="Ends on"
                help="Works until the end of this day (India time). Leave empty for no end date."
                name="expiresOn"
                type="date"
              />
              <TextField
                label="Total uses"
                help="How many orders can use it altogether. Leave empty for unlimited."
                name="usageLimit"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
              />
              <TextField
                label="Uses per customer"
                help="How many times one customer can use it. Leave empty for unlimited."
                name="perCustomerLimit"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
              />
            </FieldRow>

            <TextField
              label="Message shown to shoppers"
              help="Appears in the cart when the code works."
              name="blurb"
              maxLength={120}
              placeholder="10% off for the festive season."
            />
            <TextAreaField
              label="Internal note"
              help="Only staff see this — e.g. which campaign or school the code is for."
              name="internalNote"
              rows={2}
              maxLength={500}
            />
            <CheckboxField
              label="Turn on straight away"
              help="Untick to save it switched off and turn it on later from the list."
              name="isActive"
              defaultChecked
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" className={buttonClass("secondary")} onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <SaveButton pendingLabel="Adding…">Add coupon</SaveButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

function TypeChoice({
  value,
  current,
  onChange,
  title,
  body,
}: {
  value: DiscountType;
  current: DiscountType;
  onChange: (value: DiscountType) => void;
  title: string;
  body: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-line bg-tile-3 p-3.5 transition-colors hover:border-brand/50 has-[:checked]:border-brand">
      <input
        type="radio"
        name="type"
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{body}</span>
      </span>
    </label>
  );
}
