"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { safeNextPath } from "@repo/security/redirect";
import { buttonClass } from "@/components/primitives";
import { AuthShell, Field, GoogleButton, SwitchLink, friendlyAuthError } from "@/components/auth/auth-parts";
import { type FieldErrors, type SignInValues, fieldErrors, signInSchema } from "@/lib/auth-schemas";

// FR-5.1: login via email or Google (Supabase Auth). New customers are sent
// to /sign-up ("Create an account").

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Attacker-controllable: only ever a same-origin path (no open redirect).
  const next = safeNextPath(searchParams.get("next"), "/account/library");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors<SignInValues>>({});
  const [loading, setLoading] = useState(false);

  // Editing a field clears its message; the rest stay until the next submit.
  const edit = (field: keyof SignInValues, set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (authError) {
      setError(friendlyAuthError(authError, "sign-in"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      heading="Welcome back."
      title="Sign in"
      footer={
        <>
          Not a registered customer?{" "}
          <SwitchLink href="/sign-up" next={next}>
            Create an account
          </SwitchLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-4">
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
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={edit("password", setPassword)}
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password}
        />
        {error && <p className="text-sm font-bold text-sale">{error}</p>}
        <button type="submit" disabled={loading} className={buttonClass("primary", "lg", "w-full")}>
          {loading ? "Please wait…" : "Sign in"}
        </button>
      </form>
      <GoogleButton label="Sign in with Google" next={next} onError={setError} />
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
