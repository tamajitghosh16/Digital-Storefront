import { prisma } from "@repo/database";
import { EmptyState, PageHeader } from "@/components/ui";

// FR-11.5: sales and traffic analytics/reporting (revenue by category, top titles, conversion rate).

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function AnalyticsPage() {
  const revenueByStatus = await prisma.order.groupBy({
    by: ["status"],
    _sum: { totalCents: true },
    _count: true,
  });

  return (
    <div className="max-w-4xl">
      <PageHeader title="Analytics" description="Money taken, grouped by where each order has got to." />

      {revenueByStatus.length === 0 ? (
        <EmptyState title="Nothing to report yet" description="Figures appear here once orders start coming in." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {revenueByStatus.map((row) => (
            <div key={row.status} className="rounded-tile border border-line bg-ground p-5">
              <p className="text-sm font-semibold text-ink-muted">{row.status}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
                {money.format((row._sum.totalCents ?? 0) / 100)}
              </p>
              <p className="text-[13px] text-ink-subtle">
                {row._count} {row._count === 1 ? "order" : "orders"}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-ink-muted">
        Visitor and conversion figures come from Vercel Analytics — connect them from their dashboard once the site is
        live.
      </p>
    </div>
  );
}
