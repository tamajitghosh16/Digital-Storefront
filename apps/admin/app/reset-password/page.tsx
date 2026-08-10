"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { buttonClass, ErrorBanner, TextField } from "@/components/ui";

/**
 * Landing page for the link sent by app/forgot-password/page.tsx. Supabase's
 * browser client auto-detects the recovery code in the URL on load and
 * exchanges it for a session, firing a PASSWORD_RECOVERY auth event — we
 * wait for that (or an already-established session) before showing the
 * "set a new password" form, since the link can be stale or already used.
 */
type Status = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setStatus("ready");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (active) setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 4000);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    await supabase.auth.signOut();
    setStatus("success");
    setTimeout(() => router.push("/sign-in"), 2000);
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <div className="rounded-tile border border-line bg-ground p-8">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">Set a new password</h1>

        {status === "checking" && <p className="mt-6 text-sm leading-relaxed text-ink-muted">Verifying your link…</p>}

        {status === "invalid" && (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              This link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <a href="/forgot-password" className={buttonClass("primary", "mt-6 w-full")}>
              Request a new link
            </a>
          </>
        )}

        {status === "success" && (
          <p className="mt-6 text-sm leading-relaxed text-ink-muted">
            Password updated. Redirecting you to sign in…
          </p>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <TextField
              label="New password"
              name="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
            <TextField
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
            />

            <ErrorBanner message={error ?? undefined} />

            <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
              {loading ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
