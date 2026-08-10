"use client";

import { useState } from "react";
import { ErrorBanner, Field, Section, TextField } from "@/components/ui";
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

export function CategoryForm({ action, error }: { action: (formData: FormData) => void | Promise<void>; error?: string }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <ErrorBanner message={error} />

      <Section
        title="New category"
        description="Appears as a new item on the storefront's top menu, with a blank page of its own. You can add products under it once it exists."
      >
        <TextField
          label="Category name"
          help="What shoppers see on the menu bar."
          name="name"
          required
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            setName(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
          placeholder="Stationery"
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

      <SaveButton pendingLabel="Adding…">Add category</SaveButton>
    </form>
  );
}
