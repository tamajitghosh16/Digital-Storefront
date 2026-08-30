"use client";

import Link from "next/link";
import type { Vendor } from "@repo/database";
import { CheckboxField, ErrorBanner, FieldRow, Section, TextAreaField, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";

export function VendorForm({
  action,
  vendor,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  vendor?: Vendor;
  error?: string;
}) {
  const isEdit = Boolean(vendor);

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <ErrorBanner message={error} />

      <Section title="Vendor details" description="Who the Press orders physical stock from.">
        <TextField label="Vendor name" name="name" required defaultValue={vendor?.name} placeholder="e.g. Sagar Printers" />
        <FieldRow>
          <TextField label="Contact person" name="contactName" defaultValue={vendor?.contactName ?? ""} placeholder="Optional" />
          <TextField label="GSTIN" name="gstin" defaultValue={vendor?.gstin ?? ""} placeholder="Optional" />
        </FieldRow>
        <FieldRow>
          <TextField label="Phone" name="phone" type="tel" defaultValue={vendor?.phone ?? ""} placeholder="Optional" />
          <TextField label="Email" name="email" type="email" defaultValue={vendor?.email ?? ""} placeholder="Optional" />
        </FieldRow>
      </Section>

      <Section title="Address" description="Where this vendor ships from.">
        <TextField label="Address" name="addressLine" defaultValue={vendor?.addressLine ?? ""} placeholder="Optional" />
        <FieldRow>
          <TextField label="City" name="city" defaultValue={vendor?.city ?? ""} placeholder="Optional" />
          <TextField label="State" name="state" defaultValue={vendor?.state ?? ""} placeholder="Optional" />
        </FieldRow>
        <TextField label="Postal code" name="postalCode" defaultValue={vendor?.postalCode ?? ""} placeholder="Optional" />
      </Section>

      <Section title="Notes" description="Anything else worth remembering about this vendor.">
        <TextAreaField label="Notes" name="notes" rows={3} defaultValue={vendor?.notes ?? ""} placeholder="Optional" />
        <CheckboxField
          label="Vendor is active"
          help="Untick to hide this vendor from the picker when raising a new purchase order. Existing purchase orders keep working."
          name="isActive"
          defaultChecked={vendor?.isActive ?? true}
        />
      </Section>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-tile border border-line bg-ground/95 p-4 backdrop-blur">
        <SaveButton pendingLabel={isEdit ? "Saving…" : "Adding…"}>{isEdit ? "Save changes" : "Add vendor"}</SaveButton>
        <Link href="/supply/vendors" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
