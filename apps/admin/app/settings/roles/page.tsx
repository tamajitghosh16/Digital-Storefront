import { prisma } from "@repo/database";
import { EmptyState, PageHeader, Pill, Table } from "@/components/ui";

// FR-11.6: role-based admin access (Owner, Editor/Staff, Support).
// Read-only for now: middleware lets any admin role reach this page, and the
// role-change Server Action that will need assertRole(OWNER_ONLY_ROLES)
// doesn't exist yet — see apps/admin/CLAUDE.md.

const ROLE_BLURB: Record<string, string> = {
  OWNER: "Can do everything, including changing who works here.",
  EDITOR: "Can add books and edit the website.",
  SUPPORT: "Can look at orders and help customers.",
};

export default async function RolesPage() {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPPORT", "EDITOR", "OWNER"] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Staff & roles" description="Who can sign in to this back office, and what each of them can do." />

      {staff.length === 0 ? (
        <EmptyState title="No staff accounts yet" description="Accounts given a staff role will be listed here." />
      ) : (
        <Table
          head={
            <>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>What they can do</th>
            </>
          }
        >
          {staff.map((member) => (
            <tr key={member.id}>
              <td className="font-semibold text-ink">{member.name ?? "—"}</td>
              <td className="text-ink-muted">{member.email}</td>
              <td>
                <Pill tone={member.role === "OWNER" ? "info" : "off"}>{member.role}</Pill>
              </td>
              <td className="text-[13px] text-ink-muted">{ROLE_BLURB[member.role] ?? ""}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
