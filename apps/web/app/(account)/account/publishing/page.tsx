import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_PUBLISHING_PROJECTS } from "@/lib/sample-data";
import { formatINRWhole } from "@/lib/format";
import {
  Callout,
  SectionHead,
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
  TableWrap,
  buttonClass,
} from "@/components/primitives";

export const metadata: Metadata = { title: "Publishing & royalties" };

// FR-13.1: author dashboard — project status, sales, royalty balance.
const PROJECT_STATUS: Record<string, { label: string; tone: "ok" | "brand" | "tile"; progress: number }> = {
  SUBMITTED: { label: "Submitted · step 1 of 4", tone: "tile", progress: 25 },
  IN_REVIEW: { label: "In review · step 2 of 4", tone: "brand", progress: 50 },
  IN_PRODUCTION: { label: "In production · step 3 of 4", tone: "brand", progress: 72 },
  PROOF_READY: { label: "Proof ready · step 3 of 4", tone: "brand", progress: 85 },
  PUBLISHED: { label: "Published", tone: "ok", progress: 100 },
  REJECTED: { label: "Not accepted", tone: "tile", progress: 100 },
};

export default async function PublishingDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SELF_PUB_AUTHOR") redirect("/unauthorized");

  const projects = await withFallback(
    () =>
      prisma.selfPublishingProject.findMany({
        where: { authorId: user.id },
        include: { royalties: true },
        orderBy: { createdAt: "desc" },
      }),
    SAMPLE_PUBLISHING_PROJECTS
  );

  const royalties = projects.flatMap((project) =>
    project.royalties.map((royalty) => ({ ...royalty, bookTitle: project.bookTitle }))
  );

  const pending = royalties.filter((royalty) => royalty.payoutStatus === "PENDING");
  const paid = royalties.filter((royalty) => royalty.payoutStatus === "PAID");

  const stats = [
    {
      label: "Next payout",
      value: formatINRWhole(pending.reduce((sum, royalty) => sum + royalty.amountOwedCents, 0)),
      note: "Paid on the 7th",
    },
    {
      label: "Paid to date",
      value: formatINRWhole(paid.reduce((sum, royalty) => sum + royalty.amountOwedCents, 0)),
      note: `Across ${projects.length} project${projects.length === 1 ? "" : "s"}`,
    },
    {
      label: "Published titles",
      value: String(projects.filter((project) => project.status === "PUBLISHED").length),
      note: `${projects.length} in the programme`,
    },
  ];

  return (
    <div className="grid gap-10">
      <section>
        <SectionHead title="Publishing projects" href="/self-publishing" hrefLabel="Start another" />

        {projects.length === 0 ? (
          <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
            <h3>No projects yet</h3>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
              Start a self-publishing project and it&rsquo;ll appear here with its status and royalties.
            </p>
            <Link href="/self-publishing" className={buttonClass("primary", "md", "mt-5")}>
              Start your first project
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {projects.map((project) => {
              const status = PROJECT_STATUS[project.status] ?? {
                label: project.status,
                tone: "tile" as const,
                progress: 50,
              };
              return (
                <div key={project.id} className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
                  <Callout tone={status.tone}>{status.label}</Callout>
                  <h3 className="mt-3.5">{project.bookTitle}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {project.selectedPackage} package · updated{" "}
                    {new Date(project.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-tile-2">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${status.progress}%` }} />
                  </div>
                  <Link
                    href="/self-publishing"
                    className={buttonClass(project.status === "PUBLISHED" ? "secondary" : "primary", "sm", "mt-[18px]")}
                  >
                    {project.status === "PUBLISHED" ? "View listing" : "Review the proof"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHead title="Royalties" standfirst="Paid on the 7th, for the previous month." />

        <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-tile bg-tile p-[22px] inset-ring inset-ring-card-edge">
              <p className="caps text-ink-muted">{stat.label}</p>
              <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] tabular-nums">{stat.value}</p>
              <p className="text-sm text-ink-muted">{stat.note}</p>
            </div>
          ))}
        </div>

        {royalties.length > 0 && (
          <TableWrap>
            <table className={TABLE_CLASS}>
              <thead>
                <tr>
                  <th className={TH_CLASS}>Period</th>
                  <th className={TH_CLASS}>Title</th>
                  <th className={TH_CLASS}>Gross sales</th>
                  <th className={TH_CLASS}>Rate</th>
                  <th className={TH_CLASS}>Earned</th>
                  <th className={TH_CLASS}>Status</th>
                </tr>
              </thead>
              <tbody>
                {royalties.map((royalty) => (
                  <tr key={royalty.id}>
                    <td className={TD_CLASS}>
                      {new Date(royalty.salesPeriodEnd).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className={TD_CLASS}>{royalty.bookTitle}</td>
                    <td className={`${TD_CLASS} tabular-nums`}>{formatINRWhole(royalty.grossSalesCents)}</td>
                    <td className={`${TD_CLASS} tabular-nums`}>{royalty.royaltyRateBps / 100}%</td>
                    <td className={`${TD_CLASS} tabular-nums`}>{formatINRWhole(royalty.amountOwedCents)}</td>
                    <td className={TD_CLASS}>
                      <Callout tone={royalty.payoutStatus === "PAID" ? "ok" : "tile"}>
                        {royalty.payoutStatus === "PAID" ? "Paid" : "Pending"}
                      </Callout>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </div>
  );
}
