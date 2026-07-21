import { prisma } from "@repo/database";
import { toggleProductPublished } from "./actions";

// FR-11.1: CMS for creating/editing catalogue items (books, service packages, pricing, inventory).
export default async function CataloguePage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalogue</h1>
        <a href="/catalogue/new" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
          + New Product
        </a>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Title</th>
            <th>Type</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="py-2">
                <a href={`/catalogue/${p.id}`} className="hover:underline">
                  {p.title}
                </a>
              </td>
              <td>{p.type}</td>
              <td>₹{(p.priceCents / 100).toFixed(2)}</td>
              <td>{p.stockQty ?? "—"}</td>
              <td>{p.isPublished ? "Published" : "Draft"}</td>
              <td>
                <form action={toggleProductPublished.bind(null, p.id)}>
                  <button type="submit" className="text-xs text-brand-navy hover:underline">
                    {p.isPublished ? "Unpublish" : "Publish"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-slate-500">
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
