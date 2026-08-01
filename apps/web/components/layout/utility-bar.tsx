import Link from "next/link";
import { Wrap } from "@/components/primitives";

/**
 * Thin row above the masthead. "Help is here" with a phone number sits
 * top-left — the first thing a shopper looks for when something has gone
 * wrong — and the account shortcuts sit right, dropping out on narrow
 * screens where the phone number matters more.
 */
const SHORTCUTS = [
  { label: "Upload a manuscript", href: "/self-publishing/wizard/step-1" },
  { label: "Reorder", href: "/account/orders" },
  { label: "My library", href: "/account/library" },
  { label: "School & bulk orders", href: "/services" },
];

export function UtilityBar({ contactPhone, signedIn }: { contactPhone?: string | null; signedIn: boolean }) {
  return (
    <div className="border-b border-line">
      <Wrap className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {contactPhone && (
          <a href={`tel:${contactPhone}`} className="hover:underline">
            <strong>Help is here</strong> {contactPhone}
          </a>
        )}
        <span className="ml-auto flex items-center gap-5">
          {SHORTCUTS.map((shortcut) => (
            <Link key={shortcut.href} href={shortcut.href} className="hidden hover:underline min-[760px]:inline">
              {shortcut.label}
            </Link>
          ))}
          <Link href={signedIn ? "/account/orders" : "/sign-in"} className="hover:underline">
            {signedIn ? "My account" : "Sign in"}
          </Link>
        </span>
      </Wrap>
    </div>
  );
}
