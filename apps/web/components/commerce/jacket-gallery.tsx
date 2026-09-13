"use client";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@repo/ui/utils";
import { Callout } from "@/components/primitives";
import { BookJacket, ProductShot, type JacketFace } from "./book-jacket";

/**
 * Product-page gallery. The admin catalogue form only requires a front
 * cover scan — back cover, preface, and index page are optional — so the
 * thumbnail strip below the main shot shows exactly the faces a given
 * title actually has scans for, never a fixed set of four.
 */
const FACE_META: Record<JacketFace, { label: string; caption: string }> = {
  front: { label: "Front", caption: "Front cover" },
  back: { label: "Back", caption: "Back cover" },
  preface: { label: "Preface", caption: "Preface" },
  index: { label: "Index page", caption: "Index page" },
};

export function JacketGallery({
  title,
  author,
  coverImageUrl,
  backCoverImageUrl,
  prefaceImageUrl,
  indexPageImageUrl,
  from = "#1d1c5e",
  to = "#007acc",
  flag,
}: {
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  backCoverImageUrl?: string | null;
  prefaceImageUrl?: string | null;
  indexPageImageUrl?: string | null;
  from?: string;
  to?: string;
  flag?: string;
}) {
  // Front is the only face shown when there's no scan for it yet (drawn as
  // an illustrated jacket); the rest only appear once a real image exists.
  const faces: { face: JacketFace; imageUrl: string | null }[] = [
    { face: "front", imageUrl: coverImageUrl ?? null },
    ...(backCoverImageUrl ? [{ face: "back" as const, imageUrl: backCoverImageUrl }] : []),
    ...(prefaceImageUrl ? [{ face: "preface" as const, imageUrl: prefaceImageUrl }] : []),
    ...(indexPageImageUrl ? [{ face: "index" as const, imageUrl: indexPageImageUrl }] : []),
  ];

  const [index, setIndex] = useState(0);
  const active = faces[Math.min(index, faces.length - 1)]!;
  const activeMeta = FACE_META[active.face];

  return (
    <div style={{ ["--jacket-from" as string]: from, ["--jacket-to" as string]: to }}>
      <ProductShot aspect="aspect-[5/6]" className="p-3">
        {flag && <Callout className="absolute left-3 top-3">{flag}</Callout>}
        <BookJacket
          title={title}
          author={author}
          imageUrl={active.imageUrl}
          from={from}
          to={to}
          face={active.face}
          priority
          className="h-full w-auto"
          sizes="(min-width: 980px) 340px, 70vw"
        />
      </ProductShot>

      {faces.length > 1 && (
        <div className="mt-3.5 flex gap-3" role="group" aria-label="Book views">
          {faces.map((candidate, i) => {
            const meta = FACE_META[candidate.face];
            return (
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
                {candidate.imageUrl ? (
                  <span className="relative block aspect-square">
                    <Image src={candidate.imageUrl} alt={meta.label} fill sizes="68px" className="object-cover" />
                  </span>
                ) : (
                  <span
                    className="grid aspect-square place-items-center text-[10px] font-bold tracking-[0.04em] text-white"
                    style={{ backgroundImage: "linear-gradient(155deg,var(--jacket-from),var(--jacket-to))" }}
                  >
                    {meta.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
        {activeMeta.caption}
      </p>
    </div>
  );
}
