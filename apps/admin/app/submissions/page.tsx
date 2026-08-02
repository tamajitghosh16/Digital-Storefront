import { prisma } from "@repo/database";
import { EmptyState, PageHeader, Pill } from "@/components/ui";

// FR-11.3: queue for incoming self-publishing submissions and service
// requests with assignable status (Technical Design Document, Section 3.4).
// Read-only for now — assigning and moving status is still to be built.
export default async function SubmissionsQueuePage() {
  const [projects, serviceRequests] = await Promise.all([
    prisma.selfPublishingProject.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { author: true } }),
    prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { customer: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Submissions"
        description="Manuscripts authors have sent in, and e-book creation jobs customers have ordered."
      />

      <h2 className="mb-3 font-display text-base font-bold text-ink">Self-publishing submissions</h2>
      {projects.length === 0 ? (
        <EmptyState title="Nothing submitted yet" description="Manuscripts sent through the website land here." />
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-btn border border-line bg-ground p-4"
            >
              <span>
                <span className="block font-semibold text-ink">{project.bookTitle}</span>
                <span className="text-[13px] text-ink-muted">{project.author.name ?? project.author.email}</span>
              </span>
              <Pill tone="info">{project.status}</Pill>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-8 font-display text-base font-bold text-ink">Service requests</h2>
      {serviceRequests.length === 0 ? (
        <EmptyState title="No service requests yet" description="E-book creation jobs appear here once ordered." />
      ) : (
        <ul className="space-y-2">
          {serviceRequests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-btn border border-line bg-ground p-4"
            >
              <span>
                <span className="block font-semibold text-ink">{request.serviceType}</span>
                <span className="text-[13px] text-ink-muted">{request.customer.name ?? request.customer.email}</span>
              </span>
              <Pill tone="info">{request.status}</Pill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
