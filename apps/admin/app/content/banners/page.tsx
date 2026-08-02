import Link from "next/link";
import { prisma } from "@repo/database";
import { ButtonLink, EmptyState, PageHeader, Pill, Table } from "@/components/ui";
import { ConfirmButton, LinkButton } from "@/components/form-controls";
import { deleteBanner, toggleBannerActive } from "./actions";

export default async function BannersPage() {
  const banners = await prisma.banner.findMany({ orderBy: { order: "asc" } });
  // apps/web renders the first active banner as the hero; make that visible
  // here so nobody has to guess which row is the one on the homepage.
  const heroId = banners.find((banner) => banner.isActive)?.id;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Homepage hero"
        description="The big headline and buttons at the very top of your website. The first one that's switched on is the one people see."
        action={<ButtonLink href="/content/banners/new">Add a banner</ButtonLink>}
      />

      {banners.length === 0 ? (
        <EmptyState
          title="No hero set up yet"
          description="Add one to control the headline, paragraph and buttons at the top of the homepage. Until then the site shows its built-in wording."
          action={<ButtonLink href="/content/banners/new">Add a banner</ButtonLink>}
        />
      ) : (
        <Table
          head={
            <>
              <th>Headline</th>
              <th>Buttons</th>
              <th>Position</th>
              <th>Status</th>
              <th className="text-right">&nbsp;</th>
            </>
          }
        >
          {banners.map((banner) => (
            <tr key={banner.id}>
              <td>
                <Link
                  href={`/content/banners/${banner.id}`}
                  className="font-semibold text-ink hover:text-brand hover:underline"
                >
                  {banner.title}
                </Link>
                {banner.id === heroId && (
                  <span className="ml-2 align-middle">
                    <Pill tone="info">On the homepage now</Pill>
                  </span>
                )}
                {banner.subtitle && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{banner.subtitle}</p>}
              </td>
              <td className="text-[13px] text-ink-muted">
                {[banner.ctaText, banner.secondaryCtaText].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="tabular-nums text-ink-muted">{banner.order}</td>
              <td>
                <Pill tone={banner.isActive ? "on" : "off"}>{banner.isActive ? "On" : "Off"}</Pill>
              </td>
              <td className="space-x-4 text-right">
                <form action={toggleBannerActive.bind(null, banner.id)} className="inline">
                  <LinkButton>{banner.isActive ? "Turn off" : "Turn on"}</LinkButton>
                </form>
                <form action={deleteBanner.bind(null, banner.id)} className="inline">
                  <ConfirmButton message={`Delete the banner “${banner.title}”? This can't be undone.`}>
                    Delete
                  </ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
