"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@repo/database";
import {
  ErrorBanner,
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
 * It behaves like the Books form: opened in a modal from the list page when
 * creating (`add-line-product-dialog.tsx`), the web address is written from
 * the title with no field to hand-edit, a new item publishes straight away,
 * and the cover comes from a file picker with a live preview rather than a
 * URL field.
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
  onCancel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  config: ProductLineConfig;
  product?: Product;
  error?: string;
  /** When set, "Cancel" closes the surrounding modal instead of linking back to the list. */
  onCancel?: () => void;
}) {
  const { copy, noun } = config;
  const isEdit = Boolean(product);
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // Once a record is live its web address is a published link, and changing
  // it silently would break anyone's bookmark — so it tracks the title only
  // while creating and stays frozen when editing, same as the Books form.
  const [slugTouched] = useState(isEdit);

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

      <Section title="Price and stock" description="Prices include GST, the way Indian shops quote them.">
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

      {/*
        No visible "Availability" or "Web address / Google listing" controls,
        matching the Books form — a new item publishes immediately and picks
        up its web address from the title. These hidden inputs keep that data
        flowing to the Server Action: `slug` tracks `title` live (see the
        Title field's onChange above), and the SEO fields carry forward
        whatever an existing product already had rather than wiping it out.
        Publish/unpublish for an existing item still works from its row on
        the list (`toggleLineProductPublished`).
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
            href={lineBasePath(config.slug)}
            className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
