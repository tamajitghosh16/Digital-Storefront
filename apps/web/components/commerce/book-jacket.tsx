import Image from "next/image";
import { cn } from "@repo/ui/utils";

/**
 * A book rendered as a photographed object.
 *
 * The design shoots every product against a flat tile, so a jacket is
 * drawn rather than illustrated: a 2:3 gradient block with an inked
 * hinge down the left edge and the title set on it. Real cover art
 * replaces the drawing whenever a product has some.
 *
 * Four faces exist because the detail page's gallery shows genuinely
 * different objects, not the same jacket re-tinted.
 */

export type JacketFace = "front" | "back" | "spine" | "inside";

export interface BookJacketProps {
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  /** Gradient stops from the catalogue's sample data. */
  from?: string | null;
  to?: string | null;
  face?: JacketFace;
  /** Width as a share of the tile it sits on. */
  className?: string;
  sizes?: string;
  priority?: boolean;
}

const FALLBACK = { from: "#1d1c5e", to: "#007acc" };

export function BookJacket({
  title,
  author,
  coverImageUrl,
  from,
  to,
  face = "front",
  className,
  sizes = "(min-width: 1024px) 200px, 45vw",
  priority,
}: BookJacketProps) {
  if (coverImageUrl && face === "front") {
    return (
      <div className={cn("relative aspect-2/3 overflow-hidden rounded-[2px] shadow-book", className)}>
        <Image src={coverImageUrl} alt={title} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }

  const stops = face === "inside" ? { from: "#fbfbf8", to: "#e2e0d8" } : { from: from ?? FALLBACK.from, to: to ?? FALLBACK.to };
  const ink = face === "inside" ? "text-[#111]" : "text-white";

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[2px] shadow-book",
        face === "spine" ? "aspect-[1/6] items-center justify-center px-1 py-3" : "aspect-2/3 justify-end pb-[11px] pl-[13px] pr-[9px] pt-2.5",
        ink,
        className
      )}
      style={{ backgroundImage: `linear-gradient(155deg, ${stops.from}, ${stops.to})` }}
    >
      {/* The hinge — a hairline 4px in, which is what makes a flat
          rectangle read as a bound object. */}
      {face !== "spine" && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-1 right-0 border-l",
            face === "inside" ? "border-black/10" : "border-white/25"
          )}
        />
      )}

      {face === "front" && (
        <>
          <span className="text-[11px] font-bold leading-[1.2] tracking-[-0.01em]">{title}</span>
          {author && <span className="mt-1 text-[8px] uppercase tracking-[0.09em] opacity-[0.82]">{author}</span>}
        </>
      )}

      {face === "back" && <BackFace />}

      {face === "spine" && (
        <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-[9px] font-bold tracking-[0.02em]">
          {title}
          {author && ` · ${author}`}
        </span>
      )}

      {face === "inside" && <InsideFace />}
    </div>
  );
}

/** Blurb rules and a barcode block — the shape of a back cover, not its text. */
function BackFace() {
  return (
    <>
      <span aria-hidden className="mb-auto flex flex-col gap-1">
        {[100, 100, 100, 70, 100, 100, 52].map((width, i) => (
          <span
            key={i}
            className={cn("block h-[2.5px] rounded-[2px] bg-current opacity-[0.42]", i === 4 && "mt-1.5")}
            style={{ width: `${width}%` }}
          />
        ))}
      </span>
      <span aria-hidden className="mt-2.5 flex h-[22px] w-[58%] items-stretch gap-[1.5px] rounded-[1px] bg-white p-[3px]">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className={cn("block flex-1 bg-black", (i + 1) % 3 === 0 && "flex-[2]", (i + 1) % 4 === 0 && "opacity-25")}
          />
        ))}
      </span>
    </>
  );
}

/** A chapter opening — heading plus body rules. */
function InsideFace() {
  return (
    <span aria-hidden className="flex w-full flex-col gap-[5px]">
      <span className="mb-2 block text-[10px] font-bold tracking-[-0.01em]">One — The Weir</span>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="block h-[2.5px] rounded-[2px] bg-[#1a1a1a] opacity-30"
          style={{ width: (i + 1) % 5 === 0 ? "62%" : "100%" }}
        />
      ))}
    </span>
  );
}

/** The tile a jacket is photographed on. */
export function ProductShot({
  children,
  className,
  square,
  aspect,
}: {
  children: React.ReactNode;
  className?: string;
  square?: boolean;
  /** Tailwind aspect class to use instead of the square/4:5 default. */
  aspect?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-tile bg-tile p-[22px] inset-ring inset-ring-card-edge",
        aspect ?? (square ? "aspect-square" : "aspect-4/5"),
        className
      )}
    >
      {children}
    </div>
  );
}
