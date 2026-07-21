import { prisma } from "@repo/database";
import { toggleBannerActive, deleteBanner } from "./actions";

export default async function BannersPage() {
  const banners = await prisma.banner.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homepage Banners</h1>
        <a href="/content/banners/new" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
          + New Banner
        </a>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Title</th>
            <th>Order</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="py-2">
                <a href={`/content/banners/${b.id}`} className="hover:underline">
                  {b.title}
                </a>
              </td>
              <td>{b.order}</td>
              <td>{b.isActive ? "Active" : "Hidden"}</td>
              <td className="space-x-3">
                <form action={toggleBannerActive.bind(null, b.id)} className="inline">
                  <button type="submit" className="text-xs text-brand-navy hover:underline">
                    {b.isActive ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteBanner.bind(null, b.id)} className="inline">
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {banners.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-slate-500">
                None yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
