/**
 * Click-to-chat and mail links for the floating contact buttons.
 *
 * WhatsApp's documented way in is https://wa.me/<number>: on a phone with
 * WhatsApp it opens the app, on a desktop it offers WhatsApp Desktop or
 * WhatsApp Web, and without either it lands on WhatsApp's own download page.
 * A browser can't tell whether an app is installed (that would be a
 * fingerprinting leak), so there is no reliable "not installed" branch for us
 * to handle — wa.me is that branch.
 */

/**
 * `https://wa.me/<digits>`, or null when `number` isn't a usable
 * international number. wa.me wants country code + number, digits only — no
 * `+`, spaces, dashes or leading zeros — so "+91 98765-43210" becomes
 * "919876543210".
 */
export function whatsAppUrl(number: string | undefined | null, text?: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "").replace(/^0+/, "");
  // E.164 allows at most 15 digits; anything under 8 can't carry a country code.
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** `mailto:` link, or null for a blank or malformed address. */
export function mailtoUrl(email: string | undefined | null, subject?: string): string | null {
  const address = (email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null;
  return `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
