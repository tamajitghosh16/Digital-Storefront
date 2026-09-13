"use client";

import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui";
import { createProduct } from "./actions";
import { ProductForm } from "./product-form";

/**
 * "Add new book" → a modal holding the new-book form, opened from the Books
 * page header. Replaces the old standalone /educational-material/books/new
 * page.
 *
 * `createProduct` redirects back to the list with `?error=…` when the form
 * doesn't validate; the page passes that through and we reopen the dialog so
 * the operator sees the message. On success it redirects with `?created=1`
 * and no `error`, so the dialog stays shut and the list shows its saved
 * banner.
 */
export function AddBookDialog({ error }: { error?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (error) dialogRef.current?.showModal();
  }, [error]);

  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => dialogRef.current?.showModal()}>
        Add new book
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
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">Add a book</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Fill in what you know — you can come back and change any of it later.
          </p>

          <div className="mt-5">
            <ProductForm
              action={createProduct}
              error={error}
              onCancel={() => dialogRef.current?.close()}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
