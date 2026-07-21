import { prisma } from "@repo/database";

// FR-11.6: role-based admin access (Owner, Editor/Staff, Support).
// Owner-only page — enforced by middleware.ts (OWNER_ONLY_ROLES) + a
// server-side assertRole() check inside the role-change Server Action.
export default async function RolesPage() {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPPORT", "EDITOR", "OWNER"] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Staff & Roles</h1>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="py-2">{u.name ?? "—"}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
