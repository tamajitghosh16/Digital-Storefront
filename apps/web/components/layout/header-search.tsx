"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@repo/ui/utils";

/**
 * Masthead search. Routes to the books catalogue with `?q=`, which the
 * listing page filters server-side, so a result set is linkable.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        router.push(query ? `/books?q=${encodeURIComponent(query)}` : "/books");
      }}
      className={cn("relative", className)}
    >
      <label htmlFor="site-search" className="sr-only">
        Search the catalogue
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="What are you looking for?"
        className="h-12 w-full rounded-full border-2 border-ink bg-ground pl-5 pr-14 text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-[5px] top-[5px] grid h-[38px] w-[38px] place-items-center rounded-full bg-brand text-on-brand transition-colors hover:bg-brand-press"
      >
        <Search className="h-[17px] w-[17px]" strokeWidth={2.25} />
      </button>
    </form>
  );
}
