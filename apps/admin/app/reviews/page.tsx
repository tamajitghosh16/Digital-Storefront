import { prisma } from "@repo/database";

// FR-10.2: moderate/respond to reviews.
export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { moderationStatus: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: true, user: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Reviews Awaiting Moderation</h1>
      <ul className="mt-4 space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <p className="font-medium">{r.product.title} — {"★".repeat(r.rating)}</p>
            <p className="text-sm text-slate-500">{r.user.name ?? r.user.email}</p>
            <p className="mt-1 text-sm">{r.body}</p>
          </li>
        ))}
        {reviews.length === 0 && <p className="text-slate-500">Nothing pending.</p>}
      </ul>
    </div>
  );
}
