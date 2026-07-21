"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createClient } from "@repo/auth/client";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Separator } from "@repo/ui/separator";
import { cn } from "@repo/ui/utils";

// FR-5.1: registration/login via email or social sign-in (Supabase Auth).
function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account/orders";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-5 py-16 sm:px-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-navy-50">
        <BookOpen className="h-5 w-5 text-brand-navy" strokeWidth={1.75} />
      </div>
      <h1 className="mt-4 font-serif text-2xl font-medium text-brand-navy">
        {mode === "sign-in" ? "Welcome back" : "Create your account"}
      </h1>

      <div className="mt-6 flex w-full rounded-full border border-border bg-muted p-1">
        {(["sign-in", "sign-up"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
              mode === m ? "bg-card text-brand-navy shadow-sm" : "text-muted-foreground"
            )}
          >
            {m === "sign-in" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <Card className="mt-4 w-full">
        <CardContent className="p-6">
          {checkInbox ? (
            <p className="text-center text-sm text-muted-foreground">
              Check <span className="font-medium text-foreground">{email}</span> for a confirmation link to finish creating your account.
            </p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {error && <p className="text-sm text-brand-accent">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or continue with</span>
                <Separator className="flex-1" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle}>
                Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>
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
