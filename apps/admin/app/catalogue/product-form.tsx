import type { Product } from "@repo/database";

const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

// Shared by app/catalogue/new/page.tsx (create) and app/catalogue/[id]/page.tsx
// (edit) — `product` is undefined for create, populated for edit.
export function ProductForm({
  action,
  product,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  error?: string;
}) {
  return (
    <form action={action} className="mt-6 max-w-2xl space-y-4">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Field label="Type">
        <select name="type" defaultValue={product?.type ?? "PHYSICAL_BOOK"} className={inputClass} required>
          <option value="PHYSICAL_BOOK">Physical Book</option>
          <option value="EBOOK">E-Book</option>
          <option value="SERVICE_PACKAGE">Service Package</option>
        </select>
      </Field>

      <Field label="Title">
        <input name="title" defaultValue={product?.title} className={inputClass} required />
      </Field>

      <Field label="Author">
        <input name="author" defaultValue={product?.author} className={inputClass} required />
      </Field>

      <Field label="Slug">
        <input name="slug" defaultValue={product?.slug} className={inputClass} required />
      </Field>

      <Field label="Description">
        <textarea name="description" defaultValue={product?.description ?? ""} className={inputClass} rows={3} />
      </Field>

      <Field label="Price (INR)">
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
          className={inputClass}
          required
        />
      </Field>

      <Field label="Cover Image URL">
        <input name="coverImageUrl" defaultValue={product?.coverImageUrl ?? ""} className={inputClass} />
      </Field>

      <Field label="Stock Qty (physical books)">
        <input name="stockQty" type="number" min="0" defaultValue={product?.stockQty ?? ""} className={inputClass} />
      </Field>

      <Field label="ISBN (physical books)">
        <input name="isbn" defaultValue={product?.isbn ?? ""} className={inputClass} />
      </Field>

      <Field label="Weight in grams (physical books)">
        <input name="weightGrams" type="number" min="0" defaultValue={product?.weightGrams ?? ""} className={inputClass} />
      </Field>

      <Field label="Formats (e-books, comma-separated: EPUB, MOBI, PDF)">
        <input name="formats" defaultValue={product?.formats?.join(", ") ?? ""} className={inputClass} />
      </Field>

      <Field label="Sample URL (e-books)">
        <input name="sampleUrl" defaultValue={product?.sampleUrl ?? ""} className={inputClass} />
      </Field>

      <Field label="Turnaround days (service packages)">
        <input name="turnaroundDays" type="number" min="0" defaultValue={product?.turnaroundDays ?? ""} className={inputClass} />
      </Field>

      <Field label="Meta title (SEO)">
        <input name="metaTitle" defaultValue={product?.metaTitle ?? ""} className={inputClass} />
      </Field>

      <Field label="Meta description (SEO)">
        <textarea name="metaDescription" defaultValue={product?.metaDescription ?? ""} className={inputClass} rows={2} />
      </Field>

      <Field label="OG image URL (SEO)">
        <input name="ogImageUrl" defaultValue={product?.ogImageUrl ?? ""} className={inputClass} />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={product?.isPublished ?? true} />
        Published (visible on the storefront)
      </label>

      <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
        {product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
