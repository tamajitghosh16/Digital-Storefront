"use client";

import { useRef } from "react";
import { buttonClass, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";
import { inviteStaff } from "./actions";

/**
 * "Add new Staff" → a modal asking only for a name and email, then
 * "Send sign-up invite link", which emails a one-time `/join/<token>` link.
 * The new account is created as Read-only; the Owner sets the real role from
 * the table on this page once the person has signed up.
 */
export function AddStaffDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => dialogRef.current?.showModal()}>
        Add new Staff
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(30rem,calc(100vw-2rem))] rounded-tile border border-line-strong bg-ground p-0 text-ink backdrop:bg-ink/40"
      >
        <form action={inviteStaff} className="p-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">Invite a staff member</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            They&rsquo;ll get an email with a private sign-up link that works once and expires in an hour. They join as
            Read-only until you give them a role here.
          </p>

          <div className="mt-5 space-y-4">
            <TextField label="Name" name="name" required placeholder="e.g. Priya Sharma" autoComplete="off" />
            <TextField
              label="Email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              autoComplete="off"
              help="The invitation link is sent here."
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <SaveButton pendingLabel="Sending…">Send sign-up invite link</SaveButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
