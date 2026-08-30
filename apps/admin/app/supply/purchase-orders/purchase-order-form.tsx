"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product, Vendor } from "@repo/database";
import { Trash2 } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { buttonClass, controlClass, ErrorBanner, Field, Section, SelectField, TextAreaField, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

interface ItemRow {
  key: string;
  productId: string;
  quantity: string;
  unitCost: string;
}

function emptyRow(): ItemRow {
  return { key: crypto.randomUUID(), productId: "", quantity: "1", unitCost: "" };
}

/**
 * A variable-length list of line items, which is why this is a Client
 * Component when nothing else about a purchase order needs one. The rows
 * are serialized into a hidden "items" JSON field on submit — a plain
 * Server Action FormData can't carry an array of objects directly.
 */
export function PurchaseOrderForm({
  action,
  vendors,
  products,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  vendors: Vendor[];
  products: Product[];
  error?: string;
}) {
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((row) => row.productId && row.quantity)
          .map((row) => ({ productId: row.productId, quantity: row.quantity, unitCost: row.unitCost || "0" }))
      ),
    [rows]
  );

  const totalCents = rows.reduce((sum, row) => {
    const qty = Number(row.quantity) || 0;
    const cost = Number(row.unitCost) || 0;
    return sum + Math.round(qty * cost * 100);
  }, 0);

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  if (vendors.length === 0) {
    return (
      <div className="max-w-3xl">
        <ErrorBanner message="Add an active vendor before raising a purchase order." />
        <Link href="/supply/vendors/new" className={cn(buttonClass("primary"), "mt-4 inline-flex")}>
          Add a vendor
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-4xl space-y-5">
      <ErrorBanner message={error} />

      <Section title="Vendor and delivery" description="Who this order is going to, and when you expect it back.">
        <SelectField label="Vendor" name="vendorId" required defaultValue="">
          <option value="" disabled>
            Choose a vendor
          </option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Expected delivery date" help="Optional." name="expectedAt" type="date" />
      </Section>

      <Section title="What are you ordering?" description="Pick a book, how many copies, and the cost per copy.">
        {products.length === 0 ? (
          <p className="text-sm text-ink-muted">No physical books in the catalogue yet — add one from Books first.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-1 items-end gap-3 rounded-btn border border-line bg-tile-3 p-3.5 sm:grid-cols-[1fr_7rem_9rem_auto]"
              >
                <Field label="Book" htmlFor={`product-${row.key}`}>
                  <select
                    id={`product-${row.key}`}
                    value={row.productId}
                    onChange={(event) => updateRow(row.key, { productId: event.target.value })}
                    className={controlClass}
                  >
                    <option value="">Choose a book</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity" htmlFor={`qty-${row.key}`}>
                  <input
                    id={`qty-${row.key}`}
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                    className={controlClass}
                  />
                </Field>
                <Field label="Cost per copy" htmlFor={`cost-${row.key}`}>
                  <div className="flex items-center rounded-btn border border-line bg-ground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
                    <span className="pl-3 text-sm font-semibold text-ink-muted" aria-hidden>
                      ₹
                    </span>
                    <input
                      id={`cost-${row.key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unitCost}
                      onChange={(event) => updateRow(row.key, { unitCost: event.target.value })}
                      className="w-full bg-transparent px-2 py-2.5 text-sm text-ink focus:outline-none"
                    />
                  </div>
                </Field>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  aria-label="Remove item"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-btn border border-line-strong text-ink-muted transition-colors hover:bg-tile disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            ))}

            <button type="button" onClick={() => setRows((current) => [...current, emptyRow()])} className={buttonClass("secondary")}>
              Add another item
            </button>

            <p className="text-right text-sm font-bold text-ink">Order total: {money.format(totalCents / 100)}</p>
          </div>
        )}
        <input type="hidden" name="items" value={itemsJson} />
      </Section>

      <Section title="Notes" description="Anything else worth remembering about this order.">
        <TextAreaField label="Notes" name="notes" rows={3} placeholder="Optional" />
      </Section>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-tile border border-line bg-ground/95 p-4 backdrop-blur">
        <SaveButton pendingLabel="Creating…">Create purchase order</SaveButton>
        <Link href="/supply/purchase-orders" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
