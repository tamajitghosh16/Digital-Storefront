import { prisma } from "@repo/database";
import { getCurrentStaff, listStaffAccounts } from "@repo/auth/server";
import { EmptyState, ErrorBanner, PageHeader, Pill, SavedBanner, Table } from "@/components/ui";
import { ConfirmButton, LinkButton } from "@/components/form-controls";
import { AddStaffDialog } from "./add-staff-dialog";
import { RoleSelect } from "./role-select";
import { cancelStaffInvite, removeStaff, resendStaffInvite } from "./actions";

// FR-11.6: role-based back-office access (Owner, Editor, Support), plus the
// Read-only holding role. Staff identities live in the dedicated admin auth
// Supabase project — read here over the service-role REST client, not Prisma.
// Adding staff: "Add new Staff" emails a one-time `/join/<token>` sign-up
// link (see app/join + lib/staff-invites). Changing roles: Owner-only, via
// changeStaffRole in ./actions.

export const dynamic = "force-dynamic";

const ROLE_BLURB: Record<string, string> = {
  OWNER: "Can do everything, including changing who works here.",
  EDITOR: "Can add books and edit the website.",
  SUPPORT: "Can look at orders and help customers.",
  READER: "Signed up, but can't get in yet. Give them a role to let them work.",
};

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

function timeLeft(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const mins = Math.round(ms / 60000);
  return mins < 60 ? `expires in ${mins} min` : `expires in ${Math.round(mins / 60)} h`;
}

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{
    invited?: string;
    roleChanged?: string;
    staffRemoved?: string;
    error?: string;
  }>;
}) {
  const { invited, roleChanged, staffRemoved, error } = await searchParams;

  const [staffResult, invites, me] = await Promise.all([
    listStaffAccounts()
      .then((rows) => ({ rows, error: null as string | null }))
      .catch((e: unknown) => ({ rows: [], error: e instanceof Error ? e.message : "Could not load staff." })),
    prisma.staffInvite.findMany({ where: { acceptedAt: null }, orderBy: { createdAt: "desc" } }),
    getCurrentStaff(),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="Staff & roles"
        description="Who can sign in to this back office, and what each of them can do."
        action={<AddStaffDialog />}
      />

      {invited && <SavedBanner message={`Invitation sent to ${invited}. The link works once and expires in an hour.`} />}
      {roleChanged && <SavedBanner message="Role updated." />}
      {staffRemoved && <SavedBanner message="Staff member removed. They can no longer sign in." />}
      {error && <ErrorBanner message={error} />}
      {staffResult.error && <ErrorBanner message={staffResult.error} />}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold tracking-[-0.01em] text-ink">Staff accounts</h2>
        {staffResult.rows.length === 0 ? (
          <EmptyState
            title="No staff accounts yet"
            description="Use “Add new Staff” to send someone a sign-up link. They'll appear here once they've set a password."
          />
        ) : (
          <Table
            head={
              <>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>What they can do</th>
                <th className="text-right">&nbsp;</th>
              </>
            }
          >
            {staffResult.rows.map((member) => (
              <tr key={member.id}>
                <td className="font-semibold text-ink">{member.name ?? "—"}</td>
                <td className="text-ink-muted">{member.email}</td>
                <td>
                  <RoleSelect userId={member.id} currentRole={member.role} />
                </td>
                <td className="text-[13px] text-ink-muted">{ROLE_BLURB[member.role] ?? ""}</td>
                <td className="text-right">
                  {member.id === me?.id ? (
                    <span className="text-[13px] text-ink-muted">You</span>
                  ) : (
                    <form action={removeStaff} className="inline">
                      <input type="hidden" name="userId" value={member.id} />
                      <ConfirmButton
                        message={`Remove ${member.email}? They lose all access to the back office immediately, and their sign-in is deleted. This can't be undone.`}
                        pendingLabel="Removing…"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold tracking-[-0.01em] text-ink">Pending invitations</h2>
        {invites.length === 0 ? (
          <EmptyState title="No pending invitations" description="Sign-up links you send will be listed here until they're used or expire." />
        ) : (
          <Table
            head={
              <>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th className="text-right">&nbsp;</th>
              </>
            }
          >
            {invites.map((invite) => {
              const expired = isExpired(invite.expiresAt);
              return (
                <tr key={invite.id}>
                  <td className="font-semibold text-ink">{invite.name}</td>
                  <td className="text-ink-muted">{invite.email}</td>
                  <td>
                    <Pill tone={expired ? "off" : "info"}>{expired ? "Expired" : timeLeft(invite.expiresAt)}</Pill>
                  </td>
                  <td className="space-x-4 text-right">
                    <form action={resendStaffInvite.bind(null, invite.id)} className="inline">
                      <LinkButton>{expired ? "Send again" : "Resend"}</LinkButton>
                    </form>
                    <form action={cancelStaffInvite.bind(null, invite.id)} className="inline">
                      <LinkButton>Cancel</LinkButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>
    </div>
  );
}
