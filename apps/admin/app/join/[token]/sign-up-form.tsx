"use client";

import { useState } from "react";
import { buttonClass, ErrorBanner, Field, TextField } from "@/components/ui";
import { acceptStaffInvite } from "./actions";

/**
 * The password step of a staff invite. Name and email come from the invite
 * and can't be changed here; the person only picks a password. Submits to
 * the `acceptStaffInvite` Server Action, which creates the account and sends
 * them to sign in.
 */
export function SignUpForm({
  token,
  name,
  email,
  initialError,
}: {
  token: string;
  name: string;
  email: string;
  initialError?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={acceptStaffInvite.bind(null, token)}
      onSubmit={(event) => {
        const form = event.currentTarget;
        const password = (form.elements.namedItem("password") as HTMLInputElement).value;
        const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;
        if (password.length < 8) {
          event.preventDefault();
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirm) {
          event.preventDefault();
          setError("The two passwords don't match.");
          return;
        }
        setError(null);
        setSubmitting(true);
      }}
      className="mt-6 space-y-4"
    >
      <Field label="Name">
        <input value={name} readOnly className="w-full rounded-btn border border-line bg-tile-3 px-3 py-2.5 text-sm text-ink-muted" />
      </Field>
      <Field label="Email">
        <input value={email} readOnly className="w-full rounded-btn border border-line bg-tile-3 px-3 py-2.5 text-sm text-ink-muted" />
      </Field>

      <TextField
        label="Password"
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        help="You'll use this with your email to sign in."
      />
      <TextField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        placeholder="Type it again"
      />

      <ErrorBanner message={error ?? undefined} />

      <button type="submit" disabled={submitting} className={buttonClass("primary", "w-full")}>
        {submitting ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}
