import { Mail } from "lucide-react";
import { cn } from "@repo/ui/utils";

// A 36px circle (9px padding + 16px icon + 1px borders) that widens to a
// labelled pill on hover. `hover:` only fires on devices with a real pointer
// (Tailwind v4 wraps it in `@media (hover: hover)`), so a tap never expands
// it; keyboard focus expands it too, so the label is seen before activating.
// Below `sm` it stays a 40px icon circle.
const BUTTON_CLASS =
  "group pointer-events-auto inline-flex items-center rounded-full border text-sm font-bold shadow-tile transition-[padding,background-color,border-color] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page max-sm:size-10 max-sm:justify-center sm:h-9 sm:px-[9px] sm:hover:px-3.5 sm:focus-visible:px-3.5";

const LABEL_CLASS =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,margin,opacity] duration-200 ease-out motion-reduce:transition-none max-sm:hidden sm:group-hover:ml-1.5 sm:group-hover:max-w-32 sm:group-hover:opacity-100 sm:group-focus-visible:ml-1.5 sm:group-focus-visible:max-w-32 sm:group-focus-visible:opacity-100";

/**
 * The floating "WhatsApp us" / "Email us" pair in the bottom-right corner,
 * on every page. Plain links, so no client JS: each button renders only when
 * its href could be built (see `lib/contact.ts`), and the whole stack
 * disappears when neither can. The label is visual only; `aria-label` names
 * the link whether or not it's showing.
 */
export function ContactButtons({ whatsAppHref, emailHref }: { whatsAppHref: string | null; emailHref: string | null }) {
  if (!whatsAppHref && !emailHref) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 print:hidden">
      {emailHref && (
        <a
          href={emailHref}
          aria-label="Email us"
          className={cn(BUTTON_CLASS, "border-brand bg-ground text-brand hover:bg-tile")}
        >
          <Mail aria-hidden className="size-4 shrink-0" />
          <span className={LABEL_CLASS}>Email us</span>
        </a>
      )}
      {whatsAppHref && (
        <a
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp us (opens WhatsApp)"
          // WhatsApp's brand green, fixed in both themes. White on #25D366 is
          // only 1.98:1 (fails WCAG AA), so the label is a deep WhatsApp-family
          // green instead: #073B34 is 6.3:1 on #25D366.
          className={cn(BUTTON_CLASS, "border-[#25D366] bg-[#25D366] text-[#073B34] hover:border-[#1EBE5A] hover:bg-[#1EBE5A]")}
        >
          <WhatsAppGlyph className="size-4 shrink-0" />
          <span className={LABEL_CLASS}>WhatsApp us</span>
        </a>
      )}
    </div>
  );
}

/** WhatsApp's speech-bubble mark — lucide has no brand icons. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.41 9.41 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46Zm8.06-17.53A11.32 11.32 0 0 0 12.04.63C5.76.63.65 5.74.65 12.02c0 2 .52 3.96 1.52 5.69L.55 23.62l6.04-1.58a11.37 11.37 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.4 0-3.04-1.18-5.9-3.33-8.06Z" />
    </svg>
  );
}
