import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

/**
 * Staff invitations: the Owner adds a name + email on Staff & roles, we email
 * a `/join/<token>` link, the person sets a password there. The sign-up form
 * has no fixed public URL — `<token>` is 32 bytes of randomness and the
 * database only ever holds its SHA-256, so a leaked row can't reconstruct a
 * working link, and `/sign-up` simply doesn't exist to be found.
 */

/** How long a fresh invite link stays usable. */
export const INVITE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const INVITE_TTL_MINUTES = INVITE_TTL_MS / 60_000;

/** A fresh opaque invite token, URL-path-safe (base64url: A–Z a–z 0–9 - _). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The value stored in `StaffInvite.tokenHash`. Never store the raw token. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Absolute origin for building the emailed link. Uses `NEXT_PUBLIC_ADMIN_URL`.
 * In production that variable is required: rebuilding the origin from
 * `Host`/`X-Forwarded-Host` would let a spoofed header put an attacker's
 * domain in front of a live invite token. Outside production the request
 * host is still accepted, for local/preview convenience.
 */
export async function adminOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_ADMIN_URL must be set to send staff invites.");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "http://localhost:3001";
}

/** The link that goes in the invitation email. */
export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/join/${token}`;
}
