"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/auth/client";

/** Companion to app/sign-in/page.tsx — the layout's Topbar has nowhere else to put this. */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/sign-in");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink hover:underline disabled:opacity-60"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
