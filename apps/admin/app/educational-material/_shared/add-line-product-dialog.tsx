"use client";

import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui";
import { createLineProduct } from "./actions";
import type { ProductLineConfig } from "./product-line-config";
import { SimpleProductForm } from "./simple-product-form";

/**
 * "Add new chart" / "Add new workbook" / "Add new teaching aid" → a modal
 * holding the line's create form, opened from its list page header. The
 * same behaviour as Books' `../books/add-book-dialog.tsx`, and it replaces
 * the old standalone `<slug>/new` pages the same way.
 *
 * `createLineProduct` redirects back to the list with `?error=…` when the
 * form doesn't validate; the page passes that through and we reopen the
 * dialog so the operator sees the message. On success it redirects with
 * `?created=1` and no `error`, so the dialog stays shut and the list shows
 * its saved banner.
 */
export function AddLineProductDialog({ config, error }: { config: ProductLineConfig; error?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (error) dialogRef.current?.showModal();
  }, [error]);

  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => dialogRef.current?.showModal()}>
        Add new {config.noun}
      </button>

      {/*
        `fixed inset-0 m-auto h-fit` centres the modal on both axes: Tailwind's
        Preflight resets `dialog { margin: 0 }`, which otherwise kills the UA
        `margin: auto` that centres a :modal dialog and leaves it pinned top-left.
      */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto h-fit w-[min(48rem,calc(100vw-2rem))] max-h-[calc(100vh-4rem)] overflow-y-auto rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="p-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">{config.copy.newTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{config.copy.newDescription}</p>

          <div className="mt-5">
            <SimpleProductForm
              action={createLineProduct.bind(null, config.slug)}
              config={config}
              error={error}
              onCancel={() => dialogRef.current?.close()}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
