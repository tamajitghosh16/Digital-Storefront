"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@repo/ui/utils";
import { buttonClass } from "./ui";

/**
 * Submit controls that report what they're doing.
 *
 * A Server Action submit gives no feedback of its own: the page just sits
 * there until the redirect lands. On a slow connection that reads as "my
 * click didn't work", and the Publisher clicks again. `useFormStatus` turns
 * the wait into a visible state and blocks the second click.
 */
export function SaveButton({
  children = "Save changes",
  variant = "primary",
  pendingLabel = "Saving…",
  className,
}: {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * A submit button that asks first. Used for deletes, which are the only
 * irreversible thing in the back office — everything else is a field edit
 * or a hide/show toggle.
 */
export function ConfirmButton({
  children,
  message,
  className,
  pendingLabel = "Working…",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={cn(
        // Always underlined, not just on hover — with no red left to lean
        // on, the underline is what marks this one as irreversible.
        "text-[13px] font-semibold text-ink underline decoration-ink/40 underline-offset-2 transition-opacity hover:decoration-ink disabled:opacity-60",
        className
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Inline text-link submit, for the hide/show toggles in list rows. */
export function LinkButton({ children, pendingLabel = "…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[13px] font-semibold text-brand transition-opacity hover:underline disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
