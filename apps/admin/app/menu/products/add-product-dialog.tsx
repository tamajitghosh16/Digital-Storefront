"use client";

import { useEffect, useRef } from "react";
import type { MenuCategory } from "@repo/database";
import { buttonClass } from "@/components/ui";
import { createMenuProduct } from "./actions";
import { MenuProductForm } from "./product-form";

/**
 * "Add new Product" → a modal holding the new-product form, opened from the
 * Products page header.
 *
 * `createMenuProduct` redirects back here with `?error=…` when the payload
 * doesn't validate; the page passes that through and we reopen the dialog so
 * the operator sees the message against the fields they filled in. On
 * success it redirects with `?created=1` and no `error`, so the dialog
 * stays shut and the page shows its saved banner.
 */
export function AddProductDialog({
  categories,
  error,
}: {
  categories: MenuCategory[];
  error?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (error) dialogRef.current?.showModal();
  }, [error]);

  return (
    <>
      <button
        type="button"
        className={buttonClass("primary")}
        onClick={() => dialogRef.current?.showModal()}
      >
        Add new Product
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="p-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">Add a product</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            It appears in its category&rsquo;s dropdown on the storefront menu, with a blank page of its own. Use the
            Status switch on the list to show or hide it later.
          </p>

          <div className="mt-5">
            <MenuProductForm
              action={createMenuProduct}
              categories={categories}
              error={error}
              onCancel={() => dialogRef.current?.close()}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
