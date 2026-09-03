"use client";

import { useState } from "react";
import Link from "next/link";
import type { MenuCategory } from "@repo/database";
import { buttonClass, ErrorBanner, Field, SelectField, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";

/** Name → web address, same pattern as the catalogue form. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents rather than dropping the letter
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The "Add new Product" form body. Lives inside the modal opened from the
 * Products page header (`add-product-dialog.tsx`), so it renders plain
 * fields with no card chrome of its own. `onCancel` closes the dialog.
 */
export function MenuProductForm({
  action,
  categories,
  error,
  onCancel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: MenuCategory[];
  error?: string;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-muted">
          Products live under a category, so you&rsquo;ll need one of those first.
        </p>
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <button type="button" className={buttonClass("secondary")} onClick={onCancel}>
              Cancel
            </button>
          )}
          <Link href="/menu/categories" className={buttonClass("primary")}>
            Add a category
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <ErrorBanner message={error} />

      <SelectField label="Category" name="categoryId" required defaultValue="">
        <option value="" disabled>
          Choose a category
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Product name"
        help="What shoppers see in the dropdown and at the top of its page."
        name="name"
        required
        value={name}
        onChange={(event) => {
          const next = event.target.value;
          setName(next);
          if (!slugTouched) setSlug(slugify(next));
        }}
        placeholder="Ruled Notebook, A5"
      />

      <Field
        label="Web address"
        help="Filled in from the name. Lowercase letters, numbers and hyphens only."
        htmlFor="slug"
        required
      >
        <div className="flex items-center rounded-btn border border-line bg-ground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
          <span className="whitespace-nowrap pl-3 text-sm text-ink-subtle" aria-hidden>
            /
          </span>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className="w-full bg-transparent px-1.5 py-2.5 text-sm text-ink focus:outline-none"
          />
        </div>
      </Field>

      <div className="flex items-center justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" className={buttonClass("secondary")} onClick={onCancel}>
            Cancel
          </button>
        )}
        <SaveButton pendingLabel="Adding…">Add product</SaveButton>
      </div>
    </form>
  );
}
