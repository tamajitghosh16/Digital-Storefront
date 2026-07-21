import { prisma } from "@repo/database";

// FR-11.3: queue for incoming self-publishing submissions and service
// requests with assignable status (Technical Design Document, Section 3.4).
export default async function SubmissionsQueuePage() {
  const [projects, serviceRequests] = await Promise.all([
    prisma.selfPublishingProject.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { author: true } }),
    prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { customer: true } }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Self-Publishing Submissions</h1>
        <ul className="mt-4 space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
              <span>{p.bookTitle} — {p.author.name ?? p.author.email}</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs">{p.status}</span>
            </li>
          ))}
          {projects.length === 0 && <p className="text-slate-500">No submissions yet.</p>}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold">Service Requests</h2>
        <ul className="mt-4 space-y-2">
          {serviceRequests.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
              <span>{r.serviceType} — {r.customer.name ?? r.customer.email}</span>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs">{r.status}</span>
            </li>
          ))}
          {serviceRequests.length === 0 && <p className="text-slate-500">No service requests yet.</p>}
        </ul>
      </section>
    </div>
  );
}
