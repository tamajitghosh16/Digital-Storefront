import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Wrap, buttonClass } from "./index";

/** The two dead ends — 404 and 403. Each offers a way onward. */
const ONWARD = [
  { label: "Books", href: "/books" },
  { label: "E-Books", href: "/ebooks" },
  { label: "Publishing services", href: "/services" },
  { label: "Self-publishing", href: "/self-publishing" },
];

export function StatusPage({
  glyph,
  code,
  title,
  body,
  tone = "neutral",
}: {
  glyph: string;
  code: string;
  title: string;
  body: string;
  tone?: "neutral" | "alert";
}) {
  return (
    <Wrap className="py-24">
      <div className="mx-auto max-w-[46ch] text-center">
        <span
          aria-hidden
          className={cn(
            "mx-auto grid h-14 w-14 place-items-center rounded-full text-[22px]",
            tone === "alert" ? "bg-sale/10 text-sale" : "bg-tile"
          )}
        >
          {glyph}
        </span>
        <p className="caps mt-5 text-ink-subtle">{code}</p>
        <h1 className="mt-2 text-[30px]">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{body}</p>

        <Link href="/" className={buttonClass("primary", "md", "mt-6")}>
          Back to home
        </Link>

        <div className="mt-10 border-t border-line pt-6">
          <p className="caps text-ink-muted">Or jump to</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {ONWARD.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full bg-tile px-4 py-2.5 text-sm font-bold transition-colors hover:bg-tile-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Wrap>
  );
}
