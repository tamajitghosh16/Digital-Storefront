import { prisma } from "@repo/database";
import { EmptyState, PageHeader, Pill, Table } from "@/components/ui";

// FR-11.4: calculate and report author royalties owed per published title.
// Read-only for now — the payout run is still to be built.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function RoyaltiesPage() {
  const royalties = await prisma.royalty.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { project: { include: { author: true } } },
  });

  return (
    <div className="max-w-5xl">
      <PageHeader title="Royalties" description="What each self-published author is owed, by sales period." />

      {royalties.length === 0 ? (
        <EmptyState
          title="No royalties worked out yet"
          description="Once self-published titles start selling, each author's share appears here."
        />
      ) : (
        <Table
          head={
            <>
              <th>Title</th>
              <th>Author</th>
              <th>Period</th>
              <th>Sales</th>
              <th>Rate</th>
              <th>Owed</th>
              <th>Payout</th>
            </>
          }
        >
          {royalties.map((royalty) => (
            <tr key={royalty.id}>
              <td className="font-semibold text-ink">{royalty.project.bookTitle}</td>
              <td className="text-ink-muted">{royalty.project.author.name ?? royalty.project.author.email}</td>
              <td className="whitespace-nowrap text-[13px] text-ink-muted">
                {royalty.salesPeriodStart.toISOString().slice(0, 10)} –{" "}
                {royalty.salesPeriodEnd.toISOString().slice(0, 10)}
              </td>
              <td className="tabular-nums">{money.format(royalty.grossSalesCents / 100)}</td>
              <td className="tabular-nums text-ink-muted">{(royalty.royaltyRateBps / 100).toFixed(1)}%</td>
              <td className="tabular-nums font-semibold">{money.format(royalty.amountOwedCents / 100)}</td>
              <td>
                <Pill tone={royalty.payoutStatus === "PAID" ? "on" : "off"}>{royalty.payoutStatus}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
