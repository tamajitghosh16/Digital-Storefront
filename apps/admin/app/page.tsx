import { prisma } from "@repo/database";

// FR-11.2/FR-11.3: at-a-glance queue of new orders and submissions so
// nothing gets missed (BRD Section 6, Publisher/Admin user story).
export default async function AdminDashboard() {
  const [newOrders, pendingSubmissions, pendingServiceRequests] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.selfPublishingProject.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.serviceRequest.count({ where: { status: "SUBMITTED" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Orders to process" value={newOrders} href="/orders" />
        <StatCard label="Self-publishing submissions" value={pendingSubmissions} href="/submissions" />
        <StatCard label="Service requests" value={pendingServiceRequests} href="/submissions" />
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="block rounded-lg border border-slate-200 bg-white p-5 hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-brand-navy">{value}</p>
    </a>
  );
}
