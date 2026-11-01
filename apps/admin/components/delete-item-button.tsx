"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ErrorBanner, buttonClass } from "./ui";

/**
 * The red-outlined "Delete" button on an inventory list row, and the
 * centred confirm pop-up it opens (blurred page behind it).
 *
 * Unlike `ConfirmButton`'s `window.confirm`, this is a real dialog so it
 * can say plainly that the delete is permanent and, when the server
 * refuses (an item that's been ordered can't go), show why without
 * leaving the page. `onConfirm` is a bound Server Action returning
 * `{ error }` on refusal; on success the action revalidates the list and
 * this row disappears with it.
 */
export function DeleteItemButton({
  itemName,
  onConfirm,
}: {
  itemName: string;
  onConfirm: () => Promise<{ error?: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function open() {
    setError(undefined);
    dialogRef.current?.showModal();
  }

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.error) setError(result.error);
      else dialogRef.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Delete ${itemName}`}
        className="flex items-center gap-1.5 rounded-btn border border-danger px-2.5 py-1 text-[13px] font-semibold text-danger transition-colors hover:bg-danger hover:text-on-danger"
      >
        <Trash2 aria-hidden className="h-3.5 w-3.5" />
        Delete
      </button>

      {/* Centred the same way as AddBookDialog — see the note there on Preflight's `dialog { margin: 0 }`. */}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="fixed inset-0 m-auto h-fit w-[min(28rem,calc(100vw-2rem))] rounded-tile border border-line-strong bg-ground p-0 text-left text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-danger text-danger">
            <Trash2 aria-hidden className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold tracking-[-0.01em] text-ink">
            Delete “{itemName}”?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            It will be removed from the inventory and the storefront for good.
          </p>
          <p className="mt-3 text-sm font-semibold text-danger">This cannot be undone.</p>

          {error && (
            <div className="mt-4">
              <ErrorBanner message={error} />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className={buttonClass("primary", "bg-danger text-on-danger hover:bg-danger hover:opacity-90")}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
