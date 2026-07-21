import { prisma } from "@repo/database";

// FR-11.5: sales and traffic analytics/reporting (revenue by category, top titles, conversion rate).
export default async function AnalyticsPage() {
  const revenueByStatus = await prisma.order.groupBy({
    by: ["status"],
    _sum: { totalCents: true },
    _count: true,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
        {revenueByStatus.map((row) => (
          <div key={row.status} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{row.status}</p>
            <p className="mt-2 text-2xl font-bold">₹{((row._sum.totalCents ?? 0) / 100).toFixed(2)}</p>
            <p className="text-xs text-slate-400">{row._count} orders</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Traffic/conversion metrics come from Vercel Analytics — embed via their dashboard or API once the site is live.
      </p>
    </div>
  );
}
