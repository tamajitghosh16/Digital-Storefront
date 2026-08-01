"use client";
import { useState } from "react";
import { cn } from "@repo/ui/utils";
import { Callout } from "@/components/primitives";
import { BookJacket, ProductShot, type JacketFace } from "./book-jacket";

/**
 * Product-page gallery. The four thumbnails show genuinely different
 * objects — front, back with its barcode, spine, and an interior spread
 * — rather than the same jacket re-tinted, because that's the question a
 * shopper is actually asking when they open a book's gallery.
 */
const FACES: { face: JacketFace; label: string; caption: string; swatch: string; ink: string }[] = [
  {
    face: "front",
    label: "Front",
    caption: "Front cover",
    swatch: "linear-gradient(155deg,var(--jacket-from),var(--jacket-to))",
    ink: "#fff",
  },
  {
    face: "back",
    label: "Back",
    caption: "Back cover — blurb and barcode",
    swatch: "linear-gradient(155deg,#24344f,#141d2e)",
    ink: "#fff",
  },
  {
    face: "spine",
    label: "Spine",
    caption: "Spine",
    swatch: "linear-gradient(155deg,#16233c,var(--jacket-to))",
    ink: "#fff",
  },
  {
    face: "inside",
    label: "Inside",
    caption: "Interior spread",
    swatch: "linear-gradient(155deg,#fbfbf8,#e2e0d8)",
    ink: "#000",
  },
];

export function JacketGallery({
  title,
  author,
  coverImageUrl,
  from = "#1d1c5e",
  to = "#007acc",
  flag,
}: {
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  from?: string;
  to?: string;
  flag?: string;
}) {
  const [index, setIndex] = useState(0);
  const active = FACES[index]!;

  return (
    <div style={{ ["--jacket-from" as string]: from, ["--jacket-to" as string]: to }}>
      <ProductShot square>
        {flag && <Callout className="absolute left-3 top-3">{flag}</Callout>}
        <BookJacket
          title={title}
          author={author}
          coverImageUrl={active.face === "front" ? coverImageUrl : null}
          from={from}
          to={active.face === "spine" ? to : to}
          face={active.face}
          priority
          className={active.face === "spine" ? "h-[70%] w-auto" : "w-[46%]"}
          sizes="(min-width: 980px) 320px, 70vw"
        />
      </ProductShot>

      <div className="mt-3.5 flex gap-3" role="group" aria-label="Book views">
        {FACES.map((candidate, i) => (
          <button
            key={candidate.face}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "w-[68px] overflow-hidden rounded-[10px] bg-tile transition",
              i === index ? "inset-ring-[3px] inset-ring-ink" : "inset-ring-2 inset-ring-transparent hover:inset-ring-line-strong"
            )}
          >
            <span
              className="grid aspect-square place-items-center text-[10px] font-bold tracking-[0.04em]"
              style={{ backgroundImage: candidate.swatch, color: candidate.ink }}
            >
              {candidate.label}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
        {active.caption}
      </p>
    </div>
  );
}
