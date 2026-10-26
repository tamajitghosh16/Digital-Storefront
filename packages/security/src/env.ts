/**
 * Startup configuration checks, called from each app's `instrumentation.ts`.
 *
 * In production a missing security-critical variable is fatal: a back office
 * that silently falls back to the public customer auth project, or a webhook
 * whose secret is empty, is worse than one that refuses to boot. Outside
 * production the same problems are only warned about, so a half-configured
 * local checkout still runs.
 */

export interface EnvRule {
  name: string;
  /** Why it matters — printed with the error. */
  reason: string;
}

export interface EnvCheck {
  rules: EnvRule[];
  /** Extra invariants: return an error message, or null when fine. */
  invariants?: (() => string | null)[];
}

export function checkEnvironment(app: string, check: EnvCheck): void {
  const production = process.env.NODE_ENV === "production" && process.env.SKIP_ENV_CHECK !== "true";
  const problems: string[] = [];

  for (const rule of check.rules) {
    if (!process.env[rule.name]?.trim()) problems.push(`${rule.name} is not set — ${rule.reason}`);
  }
  for (const invariant of check.invariants ?? []) {
    const message = invariant();
    if (message) problems.push(message);
  }

  if (problems.length === 0) return;

  const report = `[security] ${app} configuration problems:\n  - ${problems.join("\n  - ")}`;
  if (production) throw new Error(report);
  console.warn(report);
}

/** No secret may ever be exposed through a `NEXT_PUBLIC_` variable (they're inlined into the browser bundle). */
export function noPublicSecrets(): string | null {
  const leaked = Object.keys(process.env).filter(
    (name) => name.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN/i.test(name)
  );
  return leaked.length ? `Secret-looking variables are exposed to the browser: ${leaked.join(", ")}` : null;
}

/** Inngest's dev mode skips request signing — it must never be on in production. */
export function noInngestDevMode(): string | null {
  return process.env.NODE_ENV === "production" && process.env.INNGEST_DEV
    ? "INNGEST_DEV is set in production — the /api/inngest endpoint would accept unsigned requests"
    : null;
}
