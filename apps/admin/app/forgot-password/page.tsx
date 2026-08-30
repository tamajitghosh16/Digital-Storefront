"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@repo/auth/client";
import { buttonClass, ErrorBanner, TextField } from "@/components/ui";

/** Companion to app/sign-in/page.tsx. Sends a Supabase recovery link that lands on /reset-password. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <div className="rounded-tile border border-line bg-ground p-8">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">Reset your password</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Enter the email you sign in with and we&rsquo;ll send you a link to set a new password.
        </p>

        {sent ? (
          <p className="mt-6 text-sm leading-relaxed text-ink-muted">
            If an account exists for <span className="font-bold text-ink">{email}</span>, a reset link is on its way. Check
            your inbox.
          </p>
        ) : (
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

            <ErrorBanner message={error ?? undefined} />

            <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link href="/sign-in" className="mt-6 inline-block text-[13px] font-semibold text-brand hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
