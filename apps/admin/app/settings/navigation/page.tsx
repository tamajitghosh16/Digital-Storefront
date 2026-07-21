import { prisma } from "@repo/database";
import { toggleNavLinkActive, deleteNavLink } from "./actions";
import type { NavLink } from "@repo/database";

function LinkTable({ links }: { links: NavLink[] }) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead className="text-left text-slate-500">
        <tr>
          <th className="py-2">Label</th>
          <th>Target</th>
          <th>Order</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {links.map((l) => (
          <tr key={l.id} className="border-t border-slate-100">
            <td className="py-2">
              <a href={`/settings/navigation/${l.id}`} className="hover:underline">
                {l.label}
              </a>
            </td>
            <td>{l.href}</td>
            <td>{l.order}</td>
            <td>{l.isActive ? "Active" : "Hidden"}</td>
            <td className="space-x-3">
              <form action={toggleNavLinkActive.bind(null, l.id)} className="inline">
                <button type="submit" className="text-xs text-brand-navy hover:underline">
                  {l.isActive ? "Hide" : "Show"}
                </button>
              </form>
              <form action={deleteNavLink.bind(null, l.id)} className="inline">
                <button type="submit" className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </form>
            </td>
          </tr>
        ))}
        {links.length === 0 && (
          <tr>
            <td colSpan={5} className="py-4 text-center text-slate-500">
              None yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default async function NavigationPage() {
  const links = await prisma.navLink.findMany({ orderBy: [{ location: "asc" }, { order: "asc" }] });
  const header = links.filter((l) => l.location === "HEADER");
  const footer = links.filter((l) => l.location === "FOOTER");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Navigation</h1>
        <a href="/settings/navigation/new" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
          + New Link
        </a>
      </div>
      <p className="mt-1 text-sm text-slate-500">Controls apps/web&apos;s header and footer navigation.</p>

      <h2 className="mt-6 text-lg font-semibold">Header</h2>
      <LinkTable links={header} />

      <h2 className="mt-8 text-lg font-semibold">Footer</h2>
      <LinkTable links={footer} />
    </div>
  );
}
