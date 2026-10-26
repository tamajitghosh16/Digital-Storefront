import { z } from "zod";
import { HTTPS_URL_MESSAGE, SAFE_HREF_MESSAGE, isHttpsUrl, isSafeHref } from "@repo/security/href";

/**
 * Shared zod fields for back-office forms whose values the storefront
 * renders. `z.string().url()` accepts `javascript:` and `data:` URLs, so
 * link and image fields go through these instead (docs/security-roadmap.md, M3).
 */

/** An absolute https:// URL — images, social profiles, sample downloads. */
export const httpsUrl = () => z.string().trim().max(2048, "That address is too long").refine(isHttpsUrl, HTTPS_URL_MESSAGE);

/** A link target: a site path (`/about`, `#faq`) or an https/http/mailto/tel URL. */
export const safeHref = () => z.string().trim().max(2048, "That link is too long").refine(isSafeHref, SAFE_HREF_MESSAGE);
