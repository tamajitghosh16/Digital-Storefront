"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { buttonClass, ErrorBanner, TextField } from "@/components/ui";

// Staff sign-in — same Supabase Auth instance as apps/web (Technical Design
// Document, Section 3.3: a staff member's identity can be shared across
// both apps if they're also a storefront customer).
//
// No sign-up here, by design (see apps/admin/CLAUDE.md, "Staff access is
// Owner-granted, not self-service"): every staff account is created by an
// Owner from Staff & roles, never by someone showing up at this form.

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (authError) setError(authError.message);
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <div className="rounded-tile border border-line bg-ground p-8">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">Staff sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">For the Publisher and staff only.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <div>
            <TextField
              label="Password"
              name="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
            <Link href="/forgot-password" className="mt-2 inline-block text-[13px] font-semibold text-brand hover:underline">
              Forgot password?
            </Link>
          </div>

          <ErrorBanner message={error ?? undefined} />

          <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink-subtle">or continue with</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <button type="button" onClick={handleGoogle} className={buttonClass("secondary", "w-full")}>
          Google
        </button>
      </div>
    </div>
  );
}

export default function AdminSignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
