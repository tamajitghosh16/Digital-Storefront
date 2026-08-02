"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { cn } from "@repo/ui/utils";
import { buttonClass, ErrorBanner, TextField } from "@/components/ui";

// Staff sign-in — same Supabase Auth instance as apps/web (Technical Design
// Document, Section 3.3: a staff member's identity can be shared across
// both apps if they're also a storefront customer). Mirrors the client-side
// signInWithPassword/signUp flow in apps/web/app/sign-in/page.tsx, restyled
// for the back office and without the marketing copy — nobody signs up here
// on a whim, so the tone is a plain utility form, not a pitch.
//
// Signing up only creates the Supabase Auth account: the sync_user.sql
// trigger gives every new row the READER role, and middleware.ts locks the
// whole app to SUPPORT/EDITOR/OWNER — so a fresh sign-up still can't get
// past the front door until an Owner grants it a staff role from Staff &
// roles. That's a gap in what's built (that page is still read-only, see
// apps/admin/CLAUDE.md), not a bug here — this page can't safely close it
// by self-granting access.

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: authError } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { name } } });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (mode === "sign-up") {
      setCheckInbox(true);
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
      <div className="mb-5 flex rounded-full border border-line-strong p-1">
        {(["sign-in", "sign-up"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => {
              setMode(option);
              setError(null);
              setCheckInbox(false);
            }}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-bold transition-colors",
              mode === option ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
            )}
          >
            {option === "sign-in" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <div className="rounded-tile border border-line bg-ground p-8">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          {mode === "sign-in" ? "Staff sign in" : "Create a staff account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {mode === "sign-in"
            ? "For the Publisher and staff only."
            : "This creates the sign-in. An owner still has to give the account a staff role from Staff & roles before it can get in."}
        </p>

        {checkInbox ? (
          <p className="mt-6 text-sm leading-relaxed text-ink-muted">
            Check <span className="font-bold text-ink">{email}</span> for a confirmation link to finish creating the
            account.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "sign-up" && (
              <TextField
                label="Name"
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            )}
            <TextField
              label="Email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
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

            <ErrorBanner message={error ?? undefined} />

            <button type="submit" disabled={loading} className={buttonClass("primary", "w-full")}>
              {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}

        {!checkInbox && (
          <>
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-ink-subtle">or continue with</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <button type="button" onClick={handleGoogle} className={buttonClass("secondary", "w-full")}>
              Google
            </button>
          </>
        )}
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
