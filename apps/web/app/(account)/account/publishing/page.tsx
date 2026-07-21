import Link from "next/link";
import { redirect } from "next/navigation";
import { FileEdit, LayoutDashboard, BookCheck, TrendingUp, Wallet } from "lucide-react";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { Card, CardContent } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_PUBLISHING_PROJECTS } from "@/lib/sample-data";

const statusVariant = {
  SUBMITTED: "muted",
  IN_REVIEW: "default",
  IN_PRODUCTION: "default",
  PROOF_READY: "success",
  PUBLISHED: "success",
  REJECTED: "accent",
} as const;

// FR-13.1: author dashboard — project status, sales, royalty balance.
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

  const activeProjects = projects.filter((p) => p.status !== "PUBLISHED" && p.status !== "REJECTED").length;
  const publishedTitles = projects.filter((p) => p.status === "PUBLISHED").length;
  const royaltyBalance = projects.reduce(
    (sum, p) => sum + p.royalties.reduce((rSum, r) => rSum + r.amountOwedCents, 0),
    0
  );
  const totalSales = projects.reduce(
    (sum, p) => sum + p.royalties.reduce((rSum, r) => rSum + r.grossSalesCents, 0),
    0
  );

  const stats = [
    { label: "Active projects", value: String(activeProjects), Icon: LayoutDashboard },
    { label: "Published titles", value: String(publishedTitles), Icon: BookCheck },
    { label: "Total sales (all time)", value: `₹${(totalSales / 100).toFixed(2)}`, Icon: TrendingUp },
    { label: "Royalty balance", value: `₹${(royaltyBalance / 100).toFixed(2)}`, Icon: Wallet },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-medium text-brand-navy">Publishing dashboard</h1>
        <Button asChild size="sm" variant="outline">
          <Link href="/self-publishing">New project</Link>
        </Button>
      </div>

      {projects.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} /> {label}
                </div>
                <p className="mt-1.5 text-xl font-semibold text-brand-navy">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileEdit className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No self-publishing projects yet.</p>
            <Button asChild size="sm">
              <Link href="/self-publishing">Start your first project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {projects.map((project) => {
            const royaltyOwed = project.royalties.reduce((sum, r) => sum + r.amountOwedCents, 0);
            return (
              <li key={project.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-medium text-foreground">{project.bookTitle}</p>
                      <Badge variant={statusVariant[project.status]} className="mt-1.5">
                        {project.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Royalty balance</p>
                      <p className="text-sm font-semibold text-foreground">₹{(royaltyOwed / 100).toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
