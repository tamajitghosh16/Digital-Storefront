"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@repo/database";
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
import { MAKER_INPUT_PLACEHOLDER, type ProductLineConfig, lineBasePath } from "./product-line-config";

/**
 * Create/edit form for one of the three simpler Educational Materials lines.
 *
 * The same shape as `../books/product-form.tsx` and built from the same
 * shared field kit (`components/ui.tsx`, `components/image-field.tsx`), but
 * there is no product-type choice to make here — every item is a plain
 * physical product — so the whole form renders at once. All the wording
 * comes from `config.copy`, which is the only thing that differs between
 * the three lines.
 *
 * The two operator conveniences it keeps from the Books form: the web
 * address is written from the title while creating (and stops the moment
 * it's edited by hand), and the cover comes from a file picker with a live
 * preview rather than a URL field.
 */

/** Title → web address, matching the pattern the Zod schema enforces. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents rather than dropping the letter
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SimpleProductForm({
  action,
  config,
  product,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  config: ProductLineConfig;
  product?: Product;
  error?: string;
}) {
  const { copy, noun } = config;
  const isEdit = Boolean(product);
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // Auto-fill the web address only while creating, and stop as soon as it's
  // typed by hand — once a record is live its address is a published link.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <ErrorBanner message={error} />

      <Section title={copy.aboutTitle} description={copy.aboutDescription}>
        <TextField
          label={copy.titleLabel}
          name="title"
          required
          value={title}
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
          placeholder={copy.titlePlaceholder}
        />

        <TextField
          label={copy.makerLabel}
          help={copy.makerHelp}
          name="maker"
          required
          defaultValue={product?.author}
          placeholder={MAKER_INPUT_PLACEHOLDER}
        />

        <TextAreaField
          label="Description"
          help={copy.descriptionHelp}
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          placeholder={copy.descriptionPlaceholder}
        />

        <ImageField
          name="coverImageUrl"
          label={copy.coverLabel}
          help={copy.coverHelp}
          defaultValue={product?.coverImageUrl}
          shape={copy.coverShape}
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
          <TextField
            label="Copies in stock"
            help="Leave empty if you aren't counting stock."
            name="stockQty"
            type="number"
            min={0}
            defaultValue={product?.stockQty ?? ""}
          />
        </FieldRow>

        <CheckboxField
          label={`Show this ${noun} in the shop`}
          help="Untick to keep working on it privately. Nobody outside the back office can see it while it's unticked."
          name="isPublished"
          defaultChecked={product?.isPublished ?? true}
        />
      </Section>

      <Section title={copy.detailsTitle} description={copy.detailsDescription}>
        <FieldRow>
          <TextField
            label={copy.codeLabel}
            help={copy.codeHelp}
            name="code"
            defaultValue={product?.isbn ?? ""}
            placeholder={copy.codePlaceholder}
          />
          <TextField
            label="Weight (grams)"
            help="One item, packed. Used to work out postage."
            name="weightGrams"
            type="number"
            min={0}
            defaultValue={product?.weightGrams ?? ""}
          />
        </FieldRow>
      </Section>

      <details className="group rounded-tile border border-line bg-ground">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-base font-bold tracking-[-0.01em] text-ink">Web address and Google listing</span>
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
                /{config.slug}/
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
              <p className="mt-1 text-[12px] text-warn">
                Changing this breaks any existing link to this {noun}.
              </p>
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
            help="Optional. Leave empty and the main image is used. Wide images (about 1200×630) work best."
            defaultValue={product?.ogImageUrl}
            shape="wide"
          />
        </div>
      </details>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-tile border border-line bg-ground/95 p-4 backdrop-blur">
        <SaveButton pendingLabel={isEdit ? "Saving…" : "Adding…"}>
          {isEdit ? "Save changes" : `Add this ${noun}`}
        </SaveButton>
        <Link
          href={lineBasePath(config.slug)}
          className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
