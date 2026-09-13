import Image from "next/image";
import { cn } from "@repo/ui/utils";

/**
 * A book rendered as a photographed object.
 *
 * When a real scan is on file, it's shown full-bleed. The front cover is
 * the only face the admin catalogue form requires, so it's the only one
 * that ever falls back to a drawn jacket (a 2:3 gradient block with an
 * inked hinge and the title set on it) — back/preface/index thumbnails
 * only exist once an operator has actually uploaded that scan, so this
 * component is never asked to draw one.
 */

export type JacketFace = "front" | "back" | "preface" | "index";

export interface BookJacketProps {
  title: string;
  author?: string | null;
  /** The scan for whichever face is currently active; null draws the illustrated jacket (front only). */
  imageUrl?: string | null;
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

const FACE_ALT_SUFFIX: Record<JacketFace, string> = {
  front: "",
  back: " — back cover",
  preface: " — preface page",
  index: " — index page",
};

export function BookJacket({
  title,
  author,
  imageUrl,
  from,
  to,
  face = "front",
  className,
  sizes = "(min-width: 1024px) 200px, 45vw",
  priority,
}: BookJacketProps) {
  if (imageUrl) {
    return (
      <div className={cn("relative aspect-2/3 overflow-hidden rounded-[2px] shadow-book", className)}>
        <Image
          src={imageUrl}
          alt={`${title}${FACE_ALT_SUFFIX[face]}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const stops = { from: from ?? FALLBACK.from, to: to ?? FALLBACK.to };

  return (
    <div
      className={cn(
        "relative flex aspect-2/3 flex-col justify-end overflow-hidden rounded-[2px] pb-[11px] pl-[13px] pr-[9px] pt-2.5 text-white shadow-book",
        className
      )}
      style={{ backgroundImage: `linear-gradient(155deg, ${stops.from}, ${stops.to})` }}
    >
      {/* The hinge — a hairline 4px in, which is what makes a flat
          rectangle read as a bound object. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1 right-0 border-l border-white/25" />
      <span className="text-[11px] font-bold leading-[1.2] tracking-[-0.01em]">{title}</span>
      {author && <span className="mt-1 text-[8px] uppercase tracking-[0.09em] opacity-[0.82]">{author}</span>}
    </div>
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
