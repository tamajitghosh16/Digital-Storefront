"use client";

import { useState } from "react";
import Link from "next/link";
import type { MenuCategory } from "@repo/database";
import { ErrorBanner, Field, SelectField, Section, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";
import { buttonClass } from "@/components/ui";

/** Name → web address, same pattern as the catalogue form. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents rather than dropping the letter
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function MenuProductForm({
  action,
  categories,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: MenuCategory[];
  error?: string;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  if (categories.length === 0) {
    return (
      <Section title="New product" description="Products live under a category, so you'll need one of those first.">
        <Link href="/menu/categories" className={buttonClass("secondary")}>
          Add a category
        </Link>
      </Section>
    );
  }

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <ErrorBanner message={error} />

      <Section
        title="New product"
        description="Appears in its category's dropdown on the storefront menu, with a blank page of its own."
      >
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

        <Field label="Web address" help="Filled in from the name. Lowercase letters, numbers and hyphens only." htmlFor="slug" required>
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
      </Section>

      <SaveButton pendingLabel="Adding…">Add product</SaveButton>
    </form>
  );
}
