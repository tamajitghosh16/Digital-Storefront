/**
 * Post-sign-in redirect targets come from the URL (`?next=`), so they are
 * attacker-controlled. Only a same-origin *path* is ever followed: anything
 * with a scheme, a protocol-relative `//host`, a backslash (browsers treat
 * `/\host` like `//host`) or a control character falls back to `fallback`.
 *
 * Pure and dependency-free so both Client Components (the sign-in pages)
 * and the proxy can use it.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  // Final check: resolving against a dummy origin must not change the origin.
  try {
    const resolved = new URL(value, "https://same-origin.invalid");
    if (resolved.origin !== "https://same-origin.invalid") return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
