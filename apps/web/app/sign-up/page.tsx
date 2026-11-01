"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { safeNextPath } from "@repo/security/redirect";
import { buttonClass } from "@/components/primitives";
import { AuthShell, Field, GoogleButton, SwitchLink, friendlyAuthError } from "@/components/auth/auth-parts";
import {
  type FieldErrors,
  type SignUpValues,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  fieldErrors,
  signUpSchema,
} from "@/lib/auth-schemas";

// FR-5.1: registration via email or Google (Supabase Auth), shown as
// "Create an account". Until transactional email (Resend) is connected the
// storefront Supabase project runs with "Confirm email" OFF, so signUp()
// returns a live session and the customer lands signed in. If that setting
// is turned back on, signUp() returns no session and this page falls back
// to "check your inbox" instead of pretending they're signed in.
//
// name/phone go into user_metadata; sync_user.sql copies `name` into
// public.users. Phone isn't a column there yet — it lives in metadata only.

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
  const [errors, setErrors] = useState<FieldErrors<SignUpValues>>({});
  const [loading, setLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  // Editing a field clears its message; the rest stay until the next submit.
  const edit = (field: keyof SignUpValues, set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = signUpSchema.safeParse({ name, email, phone, password, confirmPassword });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    const values = parsed.data;

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { name: values.name, phone: values.phone } },
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
          <form onSubmit={handleSubmit} noValidate className="grid gap-4">
            <Field
              id="name"
              label="Name"
              type="text"
              value={name}
              onChange={edit("name", setName)}
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH}
              error={errors.name}
            />
            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={edit("email", setEmail)}
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email}
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              value={phone}
              onChange={edit("phone", setPhone)}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              maxLength={20}
              error={errors.phone}
            />
            <Field
              id="password"
              label="Create a password"
              type="password"
              value={password}
              onChange={edit("password", setPassword)}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              error={errors.password}
            />
            {/* No maxLength on the inputs: the browser would silently cut a
                longer pasted password, so the 16-character rule is shown here. */}
            <PasswordChecklist password={password} />
            <Field
              id="confirm-password"
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={edit("confirmPassword", setConfirmPassword)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              error={errors.confirmPassword}
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

/** Ticks each PASSWORD_RULES entry off as the customer types. */
function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul aria-label="Password requirements" className="-mt-2 grid gap-1 text-sm sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.label} className={`flex gap-2 ${met ? "text-ok" : "text-ink-muted"}`}>
            <span aria-hidden className="w-3 font-bold">
              {met ? "✓" : "•"}
            </span>
            {rule.label}
            <span className="sr-only">{met ? " (done)" : " (not yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
