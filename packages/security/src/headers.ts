/**
 * HTTP security headers shared by apps/web and apps/admin.
 *
 * Two layers:
 *  - `staticSecurityHeaders()` — set from each app's `next.config.ts`
 *    `headers()`, so they apply to every response including static assets.
 *  - `buildContentSecurityPolicy()` — a per-request, nonce-based CSP set by
 *    each app's `proxy.ts` (Next.js reads the nonce back off the request's
 *    CSP header and stamps it on its own inline scripts).
 *
 * Dependency-free so it can be imported from `next.config.ts`.
 */

export type HeaderEntry = { key: string; value: string };

export function staticSecurityHeaders(options: { production: boolean; noIndex?: boolean }): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    // CSP's frame-ancestors supersedes this in modern browsers; kept for old ones.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: 'camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
    },
    // `same-origin-allow-popups` rather than `same-origin`: Razorpay's
    // net-banking/UPI flows open a popup that must be able to talk back.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];
  // HSTS only in production: sending it from localhost pins the dev host to https.
  if (options.production) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
  }
  if (options.noIndex) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" });
  }
  return headers;
}

/** Stricter referrer handling for pages whose URL carries a secret (invite tokens, recovery codes). */
export const NO_REFERRER_HEADERS: HeaderEntry[] = [{ key: "Referrer-Policy", value: "no-referrer" }];

/** A fresh base64 nonce per request. Web Crypto, so it works in any runtime. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Origin (scheme + host) of a URL, or null if it isn't one — used to turn env URLs into CSP sources. */
export function originOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export interface CspOptions {
  nonce: string;
  /** `next dev` needs `'unsafe-eval'` for React Refresh and a websocket for HMR. */
  development: boolean;
  scriptSrc?: string[];
  connectSrc?: string[];
  frameSrc?: string[];
  imgSrc?: string[];
  formAction?: string[];
  /** Endpoint that receives violation reports (report-uri). */
  reportUri?: string;
}

/**
 * Nonce + `strict-dynamic` script policy: only scripts carrying this
 * request's nonce run, plus whatever *they* load (which is how `next/script`
 * and Razorpay's checkout.js pull in their dependencies). Host allowlists in
 * `script-src` are ignored by CSP3 browsers under `strict-dynamic` and kept
 * only as a fallback for older ones.
 */
export function buildContentSecurityPolicy(options: CspOptions): string {
  const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter(Boolean) as string[])];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": unique([
      "'self'",
      `'nonce-${options.nonce}'`,
      "'strict-dynamic'",
      ...(options.development ? ["'unsafe-eval'"] : []),
      ...(options.scriptSrc ?? []),
    ]),
    // React style attributes and Tailwind's runtime-free output still need
    // inline styles; style injection is far less dangerous than script.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": unique(["'self'", "data:", "blob:", ...(options.imgSrc ?? [])]),
    "font-src": ["'self'", "data:"],
    "connect-src": unique([
      "'self'",
      ...(options.development ? ["ws:", "wss:"] : []),
      ...(options.connectSrc ?? []),
    ]),
    "frame-src": unique(["'self'", ...(options.frameSrc ?? [])]),
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": unique(["'self'", ...(options.formAction ?? [])]),
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };

  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!options.development) parts.push("upgrade-insecure-requests");
  if (options.reportUri) parts.push(`report-uri ${options.reportUri}`);
  return parts.join("; ");
}

/**
 * Header name for the CSP. Enforced by default. `CSP_REPORT_ONLY=true` is an
 * escape hatch: if a new third-party integration is blocked in production,
 * flip it to report-only (violations still show in the console) while the
 * allowlist is fixed, rather than turning the policy off.
 */
export function cspHeaderName(): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return process.env.CSP_REPORT_ONLY === "true" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}
