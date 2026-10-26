"use client";
import Link from "next/link";
import { createClient } from "@repo/auth/client";
import { Callout, CheckList, Wrap, buttonClass } from "@/components/primitives";

// Shared by app/sign-in and app/sign-up (FR-5.1: registration and login via
// email or Google). The benefits column is here because this storefront
// allows guest checkout — the page has to earn the account rather than
// assume it.

const BENEFITS = [
  "Re-download every e-book you've bought, on any device",
  "Track orders and shipments without digging through email",
  "Follow your self-publishing projects and royalty balance",
];

export type AuthMode = "sign-in" | "sign-up";

export function AuthShell({
  heading,
  title,
  children,
  footer,
}: {
  heading: string;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Wrap className="py-12 pb-20">
      <div className="mx-auto grid max-w-[880px] gap-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Callout>Your account</Callout>
          <h2 className="mt-4 text-[32px]">{heading}</h2>
          <p className="mt-3 text-[17px] leading-[1.55] text-ink-muted">
            One account covers the shop, your digital library and — if you publish with us — your royalty ledger.
          </p>
          <CheckList className="mt-6" items={BENEFITS} />
        </div>

        <div>
          <div className="rounded-tile bg-ground p-6 inset-ring inset-ring-line">
            <h1 className="text-center text-[26px]">{title}</h1>
            <div className="mt-6">{children}</div>
            <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

/** "Already a customer?" / "Not a registered customer?" — carries `next` across so checkout still resumes. */
export function SwitchLink({ href, next, children }: { href: string; next: string; children: React.ReactNode }) {
  const target = next === "/account/library" ? href : `${href}?next=${encodeURIComponent(next)}`;
  return (
    <Link href={target} className="font-bold text-ink underline underline-offset-2 hover:no-underline">
      {children}
    </Link>
  );
}

export function GoogleButton({
  label,
  next,
  onError,
}: {
  label: string;
  next: string;
  onError: (message: string) => void;
}) {
  async function handleGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) onError(friendlyAuthError(error, "sign-in"));
  }

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-subtle">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <button type="button" onClick={handleGoogle} className={buttonClass("secondary", "md", "w-full")}>
        {label}
      </button>
    </>
  );
}

/**
 * Supabase's raw messages can reveal whether an address is registered
 * ("User already registered") and leak internals; show a fixed set instead.
 */
export function friendlyAuthError(error: { message: string; status?: number; code?: string }, mode: AuthMode): string {
  const code = error.code ?? "";
  if (error.status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (code === "weak_password") return "Choose a stronger password — at least 8 characters, not a common one.";
  if (code === "email_not_confirmed") return "This account hasn't been activated yet. Please contact us to activate it.";
  if (mode === "sign-up") return "We couldn't create that account. Check the details, or sign in if you already have one.";
  return "That email and password don't match. Please try again.";
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  maxLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="caps text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
      />
    </div>
  );
}
