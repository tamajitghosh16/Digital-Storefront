"use client";

import { useRef, useState } from "react";
import { buttonClass, Field, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";
import { createMenuCategory } from "./actions";

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
 * "Add new Category" → a modal with the new-category form, instead of the
 * form sitting open on the page. On submit the Server Action redirects back
 * here, so a validation error surfaces in the page-level banner and the
 * dialog closes.
 */
export function AddCategoryDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => dialogRef.current?.showModal()}>
        Add new Category
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(34rem,calc(100vw-2rem))] rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
      >
        <form action={createMenuCategory} className="p-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">New category</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Appears as a new item on the storefront&rsquo;s top menu, with a blank page of its own. You can add products
            under it once it exists.
          </p>

          <div className="mt-5 space-y-4">
            <TextField
              label="Category name"
              help="What shoppers see on the menu bar."
              name="name"
              required
              autoComplete="off"
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugify(next));
              }}
              placeholder="Stationery"
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
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" className={buttonClass("secondary")} onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <SaveButton pendingLabel="Adding…">Add category</SaveButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
