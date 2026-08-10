"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Role } from "@repo/database";
import { createClient } from "@repo/auth/client";
import { buttonClass, ErrorBanner, Field, Pill, Section, SavedBanner, TextField } from "@/components/ui";

export function AccountClient({ email, role }: { email: string; role: Role }) {
  return (
    <div className="space-y-6">
      <Section title="Account details" description="Who you're signed in as.">
        <EmailField initialEmail={email} />
        <Field label="Role" help="Set by an Owner from Staff & roles — you can't change this yourself.">
          <Pill tone="info">{role}</Pill>
        </Field>
      </Section>

      <Section title="Password" description="Change the password you sign in with.">
        <PasswordChange email={email} />
      </Section>
    </div>
  );
}

// ── Email, changed with OTP verification of the new address ───────────

type EmailStep = "view" | "enter-email" | "enter-code";

function EmailField({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(initialEmail);
  const [step, setStep] = useState<EmailStep>("view");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function reset() {
    setStep("view");
    setNewEmail("");
    setCode("");
    setError(null);
  }

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setStep("enter-code");
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: code,
      type: "email_change",
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setCurrentEmail(newEmail);
    setSaved(true);
    reset();
    router.refresh();
  }

  return (
    <Field label="Email">
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink">{currentEmail}</span>
        {step === "view" && (
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setStep("enter-email");
            }}
            aria-label="Change email"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors hover:bg-tile hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {saved && <SavedBanner message="Email updated." />}

      {step === "enter-email" && (
        <form onSubmit={handleSendCode} className="mt-3 space-y-3 rounded-btn border border-line bg-tile-3 p-3.5">
          <TextField
            label="New email address"
            name="newEmail"
            type="email"
            required
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="new@example.com"
          />
          <ErrorBanner message={error ?? undefined} />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className={buttonClass("primary")}>
              {loading ? "Sending…" : "Send code"}
            </button>
            <button type="button" onClick={reset} className={buttonClass("secondary")}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "enter-code" && (
        <form onSubmit={handleVerifyCode} className="mt-3 space-y-3 rounded-btn border border-line bg-tile-3 p-3.5">
          <p className="text-[13px] leading-snug text-ink-muted">
            Enter the code sent to <span className="font-bold text-ink">{newEmail}</span>.
          </p>
          <TextField
            label="Verification code"
            name="code"
            required
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
          />
          <ErrorBanner message={error ?? undefined} />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className={buttonClass("primary")}>
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button type="button" onClick={reset} className={buttonClass("secondary")}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Field>
  );
}

// ── Password ────────────────────────────────────────────────────────

function PasswordChange({ email }: { email: string }) {
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function reset() {
    setEditing(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Re-verify the current password before allowing the change.
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reauthError) {
      setLoading(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }

    setSaved(true);
    reset();
  }

  if (!editing) {
    return (
      <div>
        {saved && <SavedBanner message="Password updated." />}
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
          className={buttonClass("secondary")}
        >
          Change password
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        required
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="••••••••"
      />
      <TextField
        label="New password"
        name="newPassword"
        type="password"
        required
        minLength={6}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
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

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className={buttonClass("primary")}>
          {loading ? "Saving…" : "Save password"}
        </button>
        <button type="button" onClick={reset} className={buttonClass("secondary")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
