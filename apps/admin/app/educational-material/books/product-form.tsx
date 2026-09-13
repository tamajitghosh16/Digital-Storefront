"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@repo/database";
import { cn } from "@repo/ui/utils";
import {
  ErrorBanner,
  FieldRow,
  MoneyField,
  Section,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { ImageField } from "@/components/image-field";
import { PdfField } from "@/components/pdf-field";
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

// Drives the storefront's genre filter — hand-mirrored from apps/web's
// `BOOK_GENRES` (lib/navigation.ts) the same way the department/nav
// taxonomy is mirrored elsewhere between the two apps (see root CLAUDE.md).
const BOOK_GENRES = [
  "Literary Fiction",
  "Fantasy",
  "Sci-Fi",
  "Poetry",
  "Non-Fiction",
  "Historical Fiction",
  "Thriller",
] as const;

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
  ebookFile,
  error,
  onCancel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  /** The already-stored e-book PDF for this product, if one exists (edit form only). */
  ebookFile?: { path: string; fileName: string; sizeBytes: number } | null;
  error?: string;
  /** When set, "Cancel" closes the surrounding modal instead of linking back to the list. */
  onCancel?: () => void;
}) {
  const isEdit = Boolean(product);
  // This form is only ever reached from the "Add a book" dialog (always a
  // book) or the Books list's own edit page (which only lists PHYSICAL_BOOK/
  // EBOOK rows) — so there's no picker for this any more. It stays derived,
  // not state, purely so a pre-existing SERVICE_PACKAGE row opened directly
  // by id still renders its own fields instead of being mislabelled a book.
  const isService = product?.type === "SERVICE_PACKAGE";
  const [hasPhysical, setHasPhysical] = useState(product?.bookFormats?.includes("PHYSICAL") ?? true);
  const [hasEbook, setHasEbook] = useState(product?.bookFormats?.includes("EBOOK") ?? false);
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // Once a record is live its web address is a published link, and changing
  // it silently would break anyone's bookmark — with no more manual slug
  // field to hand-edit, "touched" just means "already has one": true from
  // the start when editing (so it stays frozen), false when creating (so it
  // keeps tracking the title as the operator types).
  const [slugTouched] = useState(isEdit);

  const noun = isService ? "package" : "book";

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <ErrorBanner message={error} />

      <input type="hidden" name="isService" value={isService ? "true" : "false"} />

      <Section
        title={isService ? "About this package" : "About the book"}
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

        {!isService && (
          <FieldRow>
            <SelectField
              label="Genre"
              help="Lets shoppers filter the catalogue by genre. Leave unset if none quite fits."
              name="genre"
              defaultValue={product?.genre ?? ""}
            >
              <option value="">No genre set</option>
              {BOOK_GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </SelectField>
            <TextField label="ISBN" name="isbn" defaultValue={product?.isbn ?? ""} placeholder="978-81-XXXXX-XX-X" />
          </FieldRow>
        )}

        {isService && (
          <ImageField
            name="coverImageUrl"
            label="Picture for this package"
            help="Optional. Shown alongside the package where the storefront has room for it."
            defaultValue={product?.coverImageUrl}
            shape="wide"
          />
        )}
      </Section>

      {!isService && (
        <Section title="Select format" description="A book can be sold as a printed copy, an e-book, or both.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-btn border p-3.5 transition-colors",
                hasPhysical ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line bg-tile-3 hover:border-brand/50"
              )}
            >
              <input
                type="checkbox"
                name="formatPhysical"
                checked={hasPhysical}
                onChange={(event) => setHasPhysical(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block text-sm font-bold text-ink">Physical book</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                  A paperback or hardback you post to the customer.
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-btn border p-3.5 transition-colors",
                hasEbook ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line bg-tile-3 hover:border-brand/50"
              )}
            >
              <input
                type="checkbox"
                name="formatEbook"
                checked={hasEbook}
                onChange={(event) => setHasEbook(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block text-sm font-bold text-ink">E-book</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                  A file the customer downloads straight away.
                </span>
              </span>
            </label>
          </div>
          {!hasPhysical && !hasEbook && <p className="mt-2 text-[12px] text-warn">Pick at least one format.</p>}
        </Section>
      )}

      {!isService && (
        <Section title="Upload book pictures" description="Scans or photos of the physical book, used in the shop listing and kept on file.">
          <ImageField
            name="coverImageUrl"
            label="Front cover *"
            help="The image shoppers see in the shop. A photo or scan of the front cover works — portrait shape looks best."
            defaultValue={product?.coverImageUrl}
            shape="cover"
          />
          <ImageField
            name="backCoverImageUrl"
            label="Back cover"
            help="Optional. Kept on file alongside the front cover."
            defaultValue={product?.backCoverImageUrl}
            shape="cover"
          />
          <ImageField
            name="prefaceImageUrl"
            label="Preface"
            help="Optional. A scan of the preface page."
            defaultValue={product?.prefaceImageUrl}
            shape="cover"
          />
          <ImageField
            name="indexPageImageUrl"
            label="Index page"
            help="Optional. A scan of the index or contents page."
            defaultValue={product?.indexPageImageUrl}
            shape="cover"
          />
        </Section>
      )}

      <Section title="Pricing" description="Prices include GST, the way Indian shops quote them.">
        <FieldRow>
          <MoneyField
            label={hasPhysical && hasEbook ? "Price per stock (In Rupees) Physical Book" : "Price per stock (In Rupees)"}
            help="What the customer pays."
            name="price"
            required
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
          />
          {hasPhysical && hasEbook && (
            <MoneyField
              label="Price per stock (In Rupees) E-book"
              help="E-books are usually priced lower than the printed copy."
              name="ebookPrice"
              required
              defaultValue={product?.ebookPriceCents != null ? (product.ebookPriceCents / 100).toFixed(2) : ""}
            />
          )}
        </FieldRow>
      </Section>

      {!isService && hasPhysical && (
        <Section title="Stocks" description="How many printed copies you currently have on hand.">
          <TextField
            label="Total copies"
            help="Leave empty if you aren't counting stock."
            name="stockQty"
            type="number"
            min={0}
            defaultValue={product?.stockQty ?? ""}
          />
        </Section>
      )}

      {hasEbook && (
        <Section title="E-book upload" description="What the reader gets when they download.">
          {/* Only PDF is sold — no format picker needed. */}
          <input type="hidden" name="formats" value="PDF" />

          <PdfField
            name="ebookFile"
            label="Upload .pdf file"
            help="The PDF the customer downloads from their library after buying the e-book."
            defaultValue={ebookFile ?? null}
          />
        </Section>
      )}

      {/*
        Weight and the free sample link lost their form fields but keep
        flowing through as hidden inputs, same reasoning as the block below:
        an existing book's postage weight or sample link shouldn't silently
        vanish just because editing it no longer offers a field for it.
      */}
      <input type="hidden" name="weightGrams" value={product?.weightGrams ?? ""} />
      <input type="hidden" name="sampleUrl" value={product?.sampleUrl ?? ""} />

      {/*
        No visible "Availability" or "Web address / Google listing" controls
        any more — a new book publishes immediately and picks up its web
        address from the title, same as before, just without a form section
        to look at. These hidden inputs are what keep that data flowing to
        the Server Action: `slug` still tracks `title` live (see the
        `slugify` call in the Title field's onChange above), and the SEO
        fields carry forward whatever an existing product already had rather
        than wiping it out. Publish/unpublish for an existing book still
        works from its row on the Books list (`toggleProductPublished`).
      */}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="isPublished" value={isEdit ? (product?.isPublished ? "true" : "false") : "true"} />
      <input type="hidden" name="metaTitle" value={product?.metaTitle ?? ""} />
      <input type="hidden" name="metaDescription" value={product?.metaDescription ?? ""} />
      <input type="hidden" name="ogImageUrl" value={product?.ogImageUrl ?? ""} />

      <div className="flex flex-wrap items-center gap-3 rounded-tile border border-line bg-ground p-4">
        <SaveButton pendingLabel={isEdit ? "Saving…" : "Adding…"}>
          {isEdit ? "Save changes" : `Add this ${noun}`}
        </SaveButton>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
          >
            Cancel
          </button>
        ) : (
          <Link
            href="/educational-material/books"
            className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
