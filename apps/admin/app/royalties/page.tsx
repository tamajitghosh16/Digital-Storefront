import { prisma } from "@repo/database";

// FR-11.4: calculate and report author royalties owed per published title.
export default async function RoyaltiesPage() {
  const royalties = await prisma.royalty.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { project: { include: { author: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Royalties</h1>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Title</th>
            <th>Author</th>
            <th>Period</th>
            <th>Gross Sales</th>
            <th>Rate</th>
            <th>Owed</th>
            <th>Payout</th>
          </tr>
        </thead>
        <tbody>
          {royalties.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="py-2">{r.project.bookTitle}</td>
              <td>{r.project.author.name ?? r.project.author.email}</td>
              <td>
                {r.salesPeriodStart.toISOString().slice(0, 10)} – {r.salesPeriodEnd.toISOString().slice(0, 10)}
              </td>
              <td>₹{(r.grossSalesCents / 100).toFixed(2)}</td>
              <td>{(r.royaltyRateBps / 100).toFixed(1)}%</td>
              <td>₹{(r.amountOwedCents / 100).toFixed(2)}</td>
              <td>{r.payoutStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
