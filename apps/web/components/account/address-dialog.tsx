"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Address } from "@repo/database";
import { buttonClass } from "@/components/primitives";
import { createAddress, updateAddress, type AddressInput } from "@/lib/actions/addresses";

/**
 * The "Add address" / "Edit address" modal for the account details page.
 * A native <dialog> (see apps/admin's add-book-dialog.tsx for the same
 * pattern) rather than a Radix Dialog, since apps/web doesn't pull in
 * @repo/ui's Sheet primitives.
 *
 * The caller only mounts this (conditionally, keyed by the address being
 * edited) rather than passing an `open` boolean — that way `fields` starts
 * correct via its lazy initializer and there's no effect re-syncing state
 * off a changing prop, just a mount-time `showModal()`.
 */
export function AddressDialog({
  address,
  onClose,
  onSaved,
}: {
  address: Address | null;
  onClose: () => void;
  onSaved: (address: Address) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fields, setFields] = useState<AddressInput>(() => toFields(address));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function requestClose() {
    dialogRef.current?.close();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = address ? await updateAddress(address.id, fields) : await createAddress(fields);
      if (result.ok) {
        onSaved(result.address);
        requestClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-auto h-fit w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100vh-4rem)] overflow-y-auto rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
          {address ? "Edit address" : "Add a new address"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          This is used to pre-fill your delivery details at checkout.
        </p>

        <div className="mt-5 grid gap-4">
          <TextField
            id="address-label"
            label="Label — Home, Office, ..."
            value={fields.label ?? ""}
            placeholder="Home"
            onChange={(value) => setFields((current) => ({ ...current, label: value }))}
          />
          <TextField
            id="address-line1"
            label="Address line"
            required
            placeholder="Flat, building, street"
            value={fields.line1}
            onChange={(value) => setFields((current) => ({ ...current, line1: value }))}
          />
          <TextField
            id="address-line2"
            label="Apartment, suite, etc. — optional"
            value={fields.line2 ?? ""}
            onChange={(value) => setFields((current) => ({ ...current, line2: value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="address-city"
              label="City"
              required
              placeholder="Kolkata"
              value={fields.city}
              onChange={(value) => setFields((current) => ({ ...current, city: value }))}
            />
            <TextField
              id="address-state"
              label="State"
              required
              placeholder="Karnataka"
              value={fields.state}
              onChange={(value) => setFields((current) => ({ ...current, state: value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="address-postal"
              label="PIN code"
              required
              inputMode="numeric"
              placeholder="560001"
              value={fields.postalCode}
              onChange={(value) => setFields((current) => ({ ...current, postalCode: value }))}
            />
            <TextField
              id="address-phone"
              label="Phone — optional"
              inputMode="tel"
              value={fields.phone ?? ""}
              onChange={(value) => setFields((current) => ({ ...current, phone: value }))}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm font-bold text-sale">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={buttonClass("secondary")} onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className={buttonClass("primary")} disabled={pending}>
            {pending ? "Saving…" : "Save address"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function toFields(address: Address | null): AddressInput {
  return {
    label: address?.label ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postalCode: address?.postalCode ?? "",
    phone: address?.phone ?? "",
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "tel";
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="caps text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
      />
    </div>
  );
}
