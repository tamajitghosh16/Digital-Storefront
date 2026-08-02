import { prisma } from "@repo/database";
import { EmptyState, PageHeader } from "@/components/ui";

// FR-10.2: moderate/respond to reviews.
// Read-only for now — approve/reject actions are still to be built.
export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { moderationStatus: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: true, user: true },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Reviews"
        description="Reviews customers have left that are waiting to be checked before they appear on the site."
      />

      {reviews.length === 0 ? (
        <EmptyState title="Nothing waiting" description="New reviews will show up here for you to look over." />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-tile border border-line bg-ground p-5">
              <p className="font-semibold text-ink">
                {review.product.title} <span className="ml-1 text-warn">{"★".repeat(review.rating)}</span>
              </p>
              <p className="text-[13px] text-ink-muted">{review.user.name ?? review.user.email}</p>
              {review.body && <p className="mt-2 text-sm leading-relaxed">{review.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
