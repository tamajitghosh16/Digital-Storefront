import { prisma } from "@repo/database";
import { toggleFaqActive, deleteFaq } from "./actions";

export default async function FaqsPage() {
  const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQs</h1>
        <a href="/content/faqs/new" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
          + New FAQ
        </a>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Question</th>
            <th>Order</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {faqs.map((f) => (
            <tr key={f.id} className="border-t border-slate-100">
              <td className="py-2">
                <a href={`/content/faqs/${f.id}`} className="hover:underline">
                  {f.question}
                </a>
              </td>
              <td>{f.order}</td>
              <td>{f.isActive ? "Active" : "Hidden"}</td>
              <td className="space-x-3">
                <form action={toggleFaqActive.bind(null, f.id)} className="inline">
                  <button type="submit" className="text-xs text-brand-navy hover:underline">
                    {f.isActive ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteFaq.bind(null, f.id)} className="inline">
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {faqs.length === 0 && (
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
