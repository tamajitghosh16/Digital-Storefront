import Link from "next/link";
import type { NavLink as NavLinkRow } from "@repo/database";
import { prisma } from "@repo/database";
import { ButtonLink, EmptyState, PageHeader, Pill, Table } from "@/components/ui";
import { ConfirmButton, LinkButton } from "@/components/form-controls";
import { deleteNavLink, toggleNavLinkActive } from "./actions";

export default async function NavigationPage() {
  const links = await prisma.navLink.findMany({ orderBy: [{ location: "asc" }, { order: "asc" }] });
  const header = links.filter((link) => link.location === "HEADER");
  const footer = links.filter((link) => link.location === "FOOTER");

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Menu links"
        description="The links across the top of your website and down in the footer."
        action={<ButtonLink href="/settings/navigation/new">Add a link</ButtonLink>}
      />

      <h2 className="mb-3 text-base font-bold text-ink">Top of the page</h2>
      <LinkTable links={header} where="the top menu" />

      <h2 className="mb-3 mt-8 text-base font-bold text-ink">Footer</h2>
      <LinkTable links={footer} where="the footer" />
    </div>
  );
}

function LinkTable({ links, where }: { links: NavLinkRow[]; where: string }) {
  if (links.length === 0) {
    return (
      <EmptyState
        title={`Nothing in ${where} yet`}
        description="Add a link to point visitors at a page — your books, services, or an outside address."
        action={<ButtonLink href="/settings/navigation/new" variant="secondary">Add a link</ButtonLink>}
      />
    );
  }

  return (
    <Table
      head={
        <>
          <th>Wording</th>
          <th>Goes to</th>
          <th>Position</th>
          <th>Status</th>
          <th className="text-right">&nbsp;</th>
        </>
      }
    >
      {links.map((link) => (
        <tr key={link.id}>
          <td>
            <Link
              href={`/settings/navigation/${link.id}`}
              className="font-semibold text-ink hover:text-brand hover:underline"
            >
              {link.label}
            </Link>
          </td>
          <td className="font-mono text-[13px] text-ink-muted">{link.href}</td>
          <td className="tabular-nums text-ink-muted">{link.order}</td>
          <td>
            <Pill tone={link.isActive ? "on" : "off"}>{link.isActive ? "Showing" : "Hidden"}</Pill>
          </td>
          <td className="space-x-4 text-right">
            <form action={toggleNavLinkActive.bind(null, link.id)} className="inline">
              <LinkButton>{link.isActive ? "Hide" : "Show"}</LinkButton>
            </form>
            <form action={deleteNavLink.bind(null, link.id)} className="inline">
              <ConfirmButton message={`Delete the “${link.label}” link?`}>Delete</ConfirmButton>
            </form>
          </td>
        </tr>
      ))}
    </Table>
  );
}
