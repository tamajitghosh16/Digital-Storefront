"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { safeNextPath } from "@repo/security/redirect";
import { buttonClass } from "@/components/primitives";
import { AuthShell, Field, GoogleButton, SwitchLink, friendlyAuthError } from "@/components/auth/auth-parts";

// FR-5.1: registration via email or Google (Supabase Auth), shown as
// "Create an account". Until transactional email (Resend) is connected the
// storefront Supabase project runs with "Confirm email" OFF, so signUp()
// returns a live session and the customer lands signed in. If that setting
// is turned back on, signUp() returns no session and this page falls back
// to "check your inbox" instead of pretending they're signed in.
//
// name/phone go into user_metadata; sync_user.sql copies `name` into
// public.users. Phone isn't a column there yet — it lives in metadata only.

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Attacker-controllable: only ever a same-origin path (no open redirect).
  const next = safeNextPath(searchParams.get("next"), "/account/library");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) return setError("Please enter your name.");
    if (!PHONE_PATTERN.test(trimmedPhone)) return setError("Please enter a valid phone number.");
    if (password.length < 8) return setError("Choose a password of at least 8 characters.");
    if (password !== confirmPassword) return setError("The two passwords don't match.");

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: trimmedName, phone: trimmedPhone } },
    });
    setLoading(false);

    if (authError) {
      setError(friendlyAuthError(authError, "sign-up"));
      return;
    }
    if (!data.session) {
      setCheckInbox(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      heading="Create your account."
      title="Create an account"
      footer={
        <>
          Already a customer?{" "}
          <SwitchLink href="/sign-in" next={next}>
            Sign in instead
          </SwitchLink>
        </>
      }
    >
      {checkInbox ? (
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Check <span className="font-bold text-ink">{email}</span> for a confirmation link to finish creating your
          account.
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field id="name" label="Name" type="text" value={name} onChange={setName} autoComplete="name" maxLength={100} />
            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              maxLength={20}
            />
            <Field
              id="password"
              label="Create a password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
            />
            <Field
              id="confirm-password"
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={8}
            />
            {error && <p className="text-sm font-bold text-sale">{error}</p>}
            <button type="submit" disabled={loading} className={buttonClass("primary", "lg", "w-full")}>
              {loading ? "Please wait…" : "Create account"}
            </button>
          </form>
          <GoogleButton label="Sign up with Google" next={next} onError={setError} />
        </>
      )}
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
