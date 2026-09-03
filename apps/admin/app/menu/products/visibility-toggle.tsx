"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@repo/ui/utils";
import { toggleMenuProduct } from "./actions";

/**
 * The Status column control: a switch that flips a product between "Show"
 * (on the storefront menu) and "Hide". Clicking it submits
 * `toggleMenuProduct`, which flips the current DB value and revalidates the
 * list, so the switch reflects the new state on the next render.
 *
 * Built-in products (the five fixed departments) have no database row to
 * flip, so their switch is locked on "Show" — see `BuiltInSwitch`.
 */

function SwitchVisual({ on, pending }: { on: boolean; pending?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          on ? "border-ink bg-ink" : "border-line-strong bg-ground",
          pending && "opacity-60"
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full shadow-sm transition-transform",
            on ? "translate-x-[1.125rem] bg-white" : "translate-x-[0.1875rem] bg-ink-subtle"
          )}
        />
      </span>
      <span className={cn("text-[13px] font-semibold", on ? "text-ink" : "text-ink-muted")}>
        {on ? "Show" : "Hide"}
      </span>
    </span>
  );
}

function SwitchButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={isActive}
      aria-label={
        isActive
          ? "Showing on the storefront menu. Activate to hide."
          : "Hidden from the storefront menu. Activate to show."
      }
      disabled={pending}
      className="inline-flex items-center rounded-btn transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed"
    >
      <SwitchVisual on={isActive} pending={pending} />
    </button>
  );
}

/** Interactive Show/Hide switch for a live `MenuProduct` row. */
export function VisibilityToggle({ productId, isActive }: { productId: string; isActive: boolean }) {
  return (
    <form action={toggleMenuProduct.bind(null, productId)}>
      <SwitchButton isActive={isActive} />
    </form>
  );
}

/**
 * The same switch, locked on "Show", for a built-in department product. It
 * has no `MenuProduct` row, so its visibility on the menu isn't something
 * the back office can turn off.
 */
export function BuiltInSwitch() {
  return (
    <span
      className="inline-flex cursor-not-allowed items-center gap-2"
      title="Built-in page — always on the menu"
    >
      <SwitchVisual on />
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Built in</span>
    </span>
  );
}
