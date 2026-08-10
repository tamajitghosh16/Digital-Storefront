"use client";

import { useRef } from "react";

/**
 * Horizontal shelf of tiles, snapping as it scrolls. The only affordance
 * that a shelf like this scrolls sideways used to be a thin native
 * scrollbar underneath it — easy to miss, especially on desktop where
 * there's no touch-swipe hint. These arrow buttons make the interaction
 * discoverable without removing the native scroll/snap behaviour.
 */
export function ProductScroller({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x gap-4 overflow-x-auto pb-3.5 [&>*]:w-[196px] [&>*]:shrink-0 [&>*]:snap-start"
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-3.5 hidden items-center justify-between sm:flex">
        <button
          type="button"
          aria-label="Scroll to previous items"
          onClick={() => scrollByPage(-1)}
          className="pointer-events-auto -ml-5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong bg-ground text-lg text-ink-subtle shadow-tile transition hover:border-brand hover:text-brand"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Scroll to next items"
          onClick={() => scrollByPage(1)}
          className="pointer-events-auto -mr-5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong bg-ground text-lg text-ink-subtle shadow-tile transition hover:border-brand hover:text-brand"
        >
          →
        </button>
      </div>
    </div>
  );
}
