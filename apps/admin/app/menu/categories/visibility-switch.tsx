"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@repo/ui/utils";

/**
 * The Status control on each category row: a switch that shows or hides the
 * category on the storefront's top menu. It's the submit button of its
 * row's `<form>` — the enclosing form is bound to the right target (a
 * `MenuCategory` row or a built-in department), and the `visible` value it
 * submits is the state to switch *to*, i.e. the opposite of `shown`.
 */
export function VisibilitySwitch({ shown }: { shown: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="visible"
      value={shown ? "false" : "true"}
      role="switch"
      aria-checked={shown}
      disabled={pending}
      className="inline-flex items-center gap-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-60"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          shown ? "border-ink bg-ink" : "border-line-strong bg-ground"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all",
            shown ? "left-[18px] bg-ground" : "left-[3px] bg-ink-muted"
          )}
        />
      </span>
      <span className={shown ? "text-ink" : "text-ink-muted"}>
        {pending ? "Saving…" : shown ? "Shown" : "Hidden"}
      </span>
    </button>
  );
}
