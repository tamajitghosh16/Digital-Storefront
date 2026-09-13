"use client";
import { useState } from "react";
import type { Address } from "@repo/database";
import { Callout, buttonClass } from "@/components/primitives";
import { deleteAddress } from "@/lib/actions/addresses";
import { AddressDialog } from "./address-dialog";

const MAX_ADDRESSES = 5;

/** The account details page's "Saved addresses" list, plus its add/edit dialog. */
export function AddressBook({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setDialogOpen(true);
  }

  function handleSaved(address: Address) {
    setAddresses((prev) => {
      const exists = prev.some((item) => item.id === address.id);
      return exists ? prev.map((item) => (item.id === address.id ? address : item)) : [...prev, address];
    });
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const result = await deleteAddress(id);
    if (result.ok) setAddresses((prev) => prev.filter((item) => item.id !== id));
    setRemovingId(null);
  }

  const atLimit = addresses.length >= MAX_ADDRESSES;

  return (
    <div>
      {addresses.length === 0 ? (
        <div className="rounded-tile bg-tile px-6 py-10 text-center inset-ring inset-ring-card-edge">
          <p className="text-sm text-ink-muted">You haven&rsquo;t saved any addresses yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-tile bg-tile p-4 inset-ring inset-ring-card-edge">
              <p className="flex flex-wrap items-center gap-2 font-bold">
                {address.label?.trim() || "Address"}
                {address.isDefault && <Callout tone="tile">Default</Callout>}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.postalCode}
                {address.phone ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </p>
              <div className="mt-3 flex gap-4">
                <button
                  type="button"
                  onClick={() => openEdit(address)}
                  className="text-[13px] font-bold underline underline-offset-[3px]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(address.id)}
                  disabled={removingId === address.id}
                  className="text-[13px] font-bold text-ink-muted underline underline-offset-[3px] hover:text-sale disabled:pointer-events-none disabled:opacity-60"
                >
                  {removingId === address.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={openAdd} disabled={atLimit} className={buttonClass("secondary", "sm")}>
          Add another address
        </button>
        {atLimit && <p className="text-xs text-ink-muted">You&rsquo;ve reached the 5-address limit.</p>}
      </div>

      {dialogOpen && (
        <AddressDialog
          key={editing?.id ?? "new"}
          address={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
