"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@repo/auth/client";
import { cn } from "@repo/ui/utils";
import { Callout, CheckList, Wrap, buttonClass } from "@/components/primitives";

// FR-5.1: registration and login via email or Google (Supabase Auth).
// The benefits column is here because this storefront allows guest
// checkout — the page has to earn the account rather than assume it.

const BENEFITS = [
  "Re-download every e-book you've bought, on any device",
  "Track orders and shipments without digging through email",
  "Follow your self-publishing projects and royalty balance",
];

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account/library";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
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
        : await supabase.auth.signUp({ email, password });

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
    <Wrap className="py-12 pb-20">
      <div className="mx-auto grid max-w-[880px] gap-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Callout>Your account</Callout>
          <h1 className="mt-4 text-[32px]">{mode === "sign-in" ? "Welcome back." : "Create your account."}</h1>
          <p className="mt-3 text-[17px] leading-[1.55] text-ink-muted">
            One account covers the shop, your digital library and — if you publish with us — your royalty ledger.
          </p>
          <CheckList className="mt-6" items={BENEFITS} />
        </div>

        <div>
          <h1 className="text-[26px] lg:hidden">{mode === "sign-in" ? "Welcome back." : "Create your account."}</h1>

          <div className="mt-4 flex rounded-btn bg-tile p-1 lg:mt-0">
            {(["sign-in", "sign-up"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => {
                  setMode(option);
                  setError(null);
                }}
                className={cn(
                  "flex-1 rounded-[5px] py-2.5 text-sm font-bold transition-colors",
                  mode === option ? "bg-ink text-ground" : "text-ink-muted hover:text-ink"
                )}
              >
                {option === "sign-in" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-tile bg-ground p-6 inset-ring inset-ring-line">
            {checkInbox ? (
              <p className="text-[15px] leading-relaxed text-ink-muted">
                Check <span className="font-bold text-ink">{email}</span> for a confirmation link to finish creating
                your account.
              </p>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                  <Field
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  {error && <p className="text-sm font-bold text-sale">{error}</p>}
                  <button type="submit" disabled={loading} className={buttonClass("primary", "lg", "w-full")}>
                    {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-xs text-ink-subtle">or continue with</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <button type="button" onClick={handleGoogle} className={buttonClass("secondary", "md", "w-full")}>
                  Google
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Wrap>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minLength?: number;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="caps text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
