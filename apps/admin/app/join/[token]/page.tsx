import Link from "next/link";
import { prisma } from "@repo/database";
import { hashInviteToken } from "@/lib/staff-invites";
import { SignUpForm } from "./sign-up-form";

// The back office's sign-up form. It has no stable URL: you reach it only
// through an emailed `/join/<token>` link, the token is 32 random bytes, and
// the database stores only its SHA-256 — so the page can't be found by
// guessing `/sign-up` (which doesn't exist) or by reading a leaked row.
// Every invite dies after one use or one hour, whichever comes first.

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const invite = await prisma.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
  });

  const valid = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return (
    <div className="mx-auto max-w-sm py-16">
      <div className="rounded-tile border border-line bg-ground p-8">
        {valid ? (
          <>
            <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">Set up your account</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              You were invited to the back office. Choose a password to finish.
            </p>
            <SignUpForm token={token} name={invite.name} email={invite.email} initialError={error} />
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">This link isn&rsquo;t valid</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {invite?.acceptedAt
                ? "This invitation has already been used. If that wasn't you, contact the Publisher."
                : "This invitation has expired or the link is wrong. Invitations last one hour — ask the Publisher to send a new one."}
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-block text-[13px] font-semibold text-brand hover:underline"
            >
              ← Go to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
