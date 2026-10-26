/**
 * Structured security-event logging. One JSON line per event on stderr, with
 * a fixed `"security": true` marker so a Vercel log drain / Sentry / Datadog
 * filter can route and alert on them (CERT-In expects ICT logs to be kept
 * for 180 days — configure retention on the drain, not here).
 *
 * Never pass secrets, tokens, passwords, full card/payment payloads, or
 * addresses in `details`. Emails and user ids are fine — they're what an
 * investigator needs.
 */

const REDACT_KEYS = /pass(word)?|secret|token|signature|authorization|cookie|otp|code$/i;

function redact(details: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    out[key] = REDACT_KEYS.test(key) ? "[redacted]" : value;
  }
  return out;
}

export type SecurityEventName =
  | "auth.forbidden"
  | "auth.misconfigured"
  | "checkout.bad_signature"
  | "checkout.payment_mismatch"
  | "checkout.rejected_item"
  | "webhook.bad_signature"
  | "webhook.amount_mismatch"
  | "webhook.paid_after_cancel"
  | "library.not_entitled"
  | "library.limit_reached"
  | "upload.rejected"
  | "staff_invite.invalid_token"
  | "revalidate.unauthorized"
  | "rate_limit.exceeded"
  | "rate_limit.backend_error"
  | "malware.scan_skipped"
  | "malware.detected";

export function securityEvent(name: SecurityEventName, details: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    security: true,
    event: name,
    at: new Date().toISOString(),
    ...redact(details),
  });
  console.warn(line);
}
