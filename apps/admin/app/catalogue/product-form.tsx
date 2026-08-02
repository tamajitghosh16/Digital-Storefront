"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product, ProductType } from "@repo/database";
import { cn } from "@repo/ui/utils";
import {
  CheckboxField,
  ErrorBanner,
  Field,
  FieldRow,
  MoneyField,
  Section,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { ImageField } from "@/components/image-field";
import { SaveButton } from "@/components/form-controls";

/**
 * Create/edit form for anything in the catalogue.
 *
 * A Client Component for one reason: what you're selling decides which fields
 * make sense. The old form showed all seventeen at once, so someone adding an
 * e-book was asked for a shipping weight and someone adding a paperback was
 * asked for a turnaround time. Here the type is picked first and the rest of
 * the form follows from it.
 *
 * The two other things it does for a non-technical editor: it writes the web
 * address from the title so nobody has to know what a slug is, and it takes
 * the cover from a file picker instead of asking for a URL.
 */

const TYPES: { value: ProductType; label: string; blurb: string }[] = [
  { value: "PHYSICAL_BOOK", label: "Printed book", blurb: "A paperback or hardback you post to the customer." },
  { value: "EBOOK", label: "E-book", blurb: "A file the customer downloads straight away." },
  { value: "SERVICE_PACKAGE", label: "Service package", blurb: "A self-publishing or e-book creation package." },
];

const EBOOK_FORMATS = ["EPUB", "MOBI", "PDF"];

/** Title → web address, matching the pattern the Zod schema enforces. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents rather than dropping the letter
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  action,
  product,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  error?: string;
}) {
  const isEdit = Boolean(product);
  const [type, setType] = useState<ProductType>(product?.type ?? "PHYSICAL_BOOK");
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // Once a record is live its web address is a published link, and changing
  // it silently would break anyone's bookmark — so auto-fill only runs while
  // creating, and stops the moment the address is typed in by hand.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [formats, setFormats] = useState<string[]>(product?.formats ?? ["EPUB", "PDF"]);

  const isBook = type === "PHYSICAL_BOOK";
  const isEbook = type === "EBOOK";
  const isService = type === "SERVICE_PACKAGE";
  const noun = isService ? "package" : "book";

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <ErrorBanner message={error} />

      <Section title="What are you adding?" description="This decides what else the form asks you for.">
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-btn border p-3.5 transition-colors",
                type === option.value
                  ? "border-brand bg-brand-soft ring-1 ring-brand"
                  : "border-line bg-tile-3 hover:border-brand/50"
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                <span className="text-sm font-bold text-ink">{option.label}</span>
              </span>
              <span className="mt-1 block text-[12px] leading-snug text-ink-muted">{option.blurb}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section
        title={isService ? "About this package" : "About this book"}
        description={`What shoppers read on the ${noun}'s own page and in the shop listing.`}
      >
        <TextField
          label={isService ? "Package name" : "Title"}
          name="title"
          required
          value={title}
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
          placeholder={isService ? "Guided publishing" : "The Bookseller of Kolkata"}
        />

        <TextField
          label={isService ? "Offered by" : "Author"}
          help={isService ? "Usually your imprint's name." : undefined}
          name="author"
          required
          defaultValue={product?.author}
          placeholder={isService ? "New School Book Press" : "Shashibhushan Roy"}
        />

        <TextAreaField
          label="Description"
          help={
            isService
              ? "Put one benefit on each line — the homepage turns the first four lines into a ticked list."
              : "The blurb on the product page. A short paragraph or two."
          }
          name="description"
          rows={isService ? 5 : 4}
          defaultValue={product?.description ?? ""}
          placeholder={
            isService ? "Cover design\nISBN registration\nStorefront listing\nTwo rounds of proofs" : undefined
          }
        />

        <ImageField
          name="coverImageUrl"
          label={isService ? "Picture for this package" : "Front cover"}
          help={
            isService
              ? "Optional. Shown alongside the package where the storefront has room for it."
              : "The image shoppers see in the shop. A photo or scan of the front cover works — portrait shape looks best."
          }
          defaultValue={product?.coverImageUrl}
          shape={isService ? "wide" : "cover"}
        />
      </Section>

      <Section title="Price and availability" description="Prices include GST, the way Indian shops quote them.">
        <FieldRow>
          <MoneyField
            label="Price"
            help="What the customer pays."
            name="price"
            required
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
          />
          {isBook && (
            <TextField
              label="Copies in stock"
              help="Leave empty if you aren't counting stock."
              name="stockQty"
              type="number"
              min={0}
              defaultValue={product?.stockQty ?? ""}
            />
          )}
          {isService && (
            <TextField
              label="Turnaround (days)"
              help="Shown as “14-day turnaround” on the homepage."
              name="turnaroundDays"
              type="number"
              min={0}
              defaultValue={product?.turnaroundDays ?? ""}
            />
          )}
        </FieldRow>

        <CheckboxField
          label={`Show this ${noun} in the shop`}
          help="Untick to keep working on it privately. Nobody outside the back office can see it while it's unticked."
          name="isPublished"
          defaultChecked={product?.isPublished ?? true}
        />
      </Section>

      {isBook && (
        <Section title="Printed book details" description="Used on the product page and for working out postage.">
          <FieldRow>
            <TextField label="ISBN" name="isbn" defaultValue={product?.isbn ?? ""} placeholder="978-81-XXXXX-XX-X" />
            <TextField
              label="Weight (grams)"
              help="One copy, packed."
              name="weightGrams"
              type="number"
              min={0}
              defaultValue={product?.weightGrams ?? ""}
            />
          </FieldRow>
        </Section>
      )}

      {isEbook && (
        <Section title="E-book details" description="What the reader gets when they download.">
          <Field label="File formats you supply" help="Listed on the product page.">
            <div className="flex flex-wrap gap-2">
              {EBOOK_FORMATS.map((format) => {
                const on = formats.includes(format);
                return (
                  <label
                    key={format}
                    className={cn(
                      "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
                      on ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-ground text-ink-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setFormats((current) =>
                          current.includes(format) ? current.filter((item) => item !== format) : [...current, format]
                        )
                      }
                      className="sr-only"
                    />
                    {format}
                  </label>
                );
              })}
            </div>
            {/* The Server Action still reads one comma-separated string. */}
            <input type="hidden" name="formats" value={formats.join(", ")} />
          </Field>

          <TextField
            label="Free sample link"
            help="Optional. A link to a preview chapter."
            name="sampleUrl"
            type="url"
            defaultValue={product?.sampleUrl ?? ""}
            placeholder="https://…"
          />
        </Section>
      )}

      <details className="group rounded-tile border border-line bg-ground">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-base font-bold tracking-[-0.01em] text-ink">
              Web address and Google listing
            </span>
            <span className="mt-1 block text-sm text-ink-muted">
              Filled in for you. Open this only if you want to change how it looks in search results.
            </span>
          </span>
          <span aria-hidden className="text-xl text-ink-muted">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>

        <div className="space-y-5 px-6 pb-6">
          <Field
            label="Web address"
            help="The last part of the link to this page. Lowercase letters, numbers and hyphens."
            htmlFor="slug"
            required
          >
            <div className="flex items-center rounded-btn border border-line bg-ground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
              <span className="whitespace-nowrap pl-3 text-sm text-ink-subtle" aria-hidden>
                /{isService ? "services" : isEbook ? "ebooks" : "books"}/
              </span>
              <input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                className="w-full bg-transparent px-1.5 py-2.5 text-sm text-ink focus:outline-none"
              />
            </div>
            {isEdit && (
              <p className="mt-1 text-[12px] text-warn">Changing this breaks any existing link to this {noun}.</p>
            )}
          </Field>

          <TextField
            label="Title in Google results"
            help="Leave empty to use the title above."
            name="metaTitle"
            defaultValue={product?.metaTitle ?? ""}
          />
          <TextAreaField
            label="Description in Google results"
            help="Around 150 characters. Leave empty to use the description above."
            name="metaDescription"
            rows={2}
            defaultValue={product?.metaDescription ?? ""}
          />
          <ImageField
            name="ogImageUrl"
            label="Picture when shared on social media"
            help="Optional. Leave empty and the cover is used. Wide images (about 1200×630) work best."
            defaultValue={product?.ogImageUrl}
            shape="wide"
          />
        </div>
      </details>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-tile border border-line bg-ground/95 p-4 backdrop-blur">
        <SaveButton pendingLabel={isEdit ? "Saving…" : "Adding…"}>
          {isEdit ? "Save changes" : `Add this ${noun}`}
        </SaveButton>
        <Link href="/catalogue" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
