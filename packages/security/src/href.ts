/**
 * Link and URL checks for anything an operator types into the back office
 * that the storefront later renders as an `href` or `src`. `z.string().url()`
 * happily accepts `javascript:alert(1)` and `data:text/html,...`, so every
 * CMS URL field refines through one of these.
 *
 * Pure and dependency-free (no zod import) so each app keeps its own zod
 * version and Client Components can use them too.
 */

const SAFE_LINK_SCHEMES = new Set(["https:", "http:", "mailto:", "tel:"]);

/**
 * A link target the storefront may render: a same-site path (`/about`,
 * `/books?genre=x`, `#faq`), or an absolute `https:`/`http:`/`mailto:`/`tel:`
 * URL. Rejects `javascript:`, `data:`, `vbscript:`, protocol-relative `//host`
 * and anything with control characters or backslashes.
 */
export function isSafeHref(value: string | null | undefined): boolean {
  if (!value) return false;
  const href = value.trim();
  // eslint-disable-next-line no-control-regex
  if (!href || /[\u0000-\u001f\u007f\\]/.test(href)) return false;
  if (href.startsWith("#")) return true;
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    return SAFE_LINK_SCHEMES.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

/** An absolute `https:` URL — for images, social profiles and downloadable samples. */
export function isHttpsUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Render-time guard: the href if it's safe, otherwise `fallback`. */
export function safeHrefOr(value: string | null | undefined, fallback = "#"): string {
  return isSafeHref(value) ? value!.trim() : fallback;
}

export const SAFE_HREF_MESSAGE = "Use a site path like /about, or a full https://, mailto: or tel: link";
export const HTTPS_URL_MESSAGE = "Must be a full https:// address";
