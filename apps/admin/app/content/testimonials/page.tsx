import { prisma } from "@repo/database";
import { toggleTestimonialActive, deleteTestimonial } from "./actions";

export default async function TestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Testimonials</h1>
        <a href="/content/testimonials/new" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
          + New Testimonial
        </a>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Author</th>
            <th>Rating</th>
            <th>Order</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {testimonials.map((t) => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="py-2">
                <a href={`/content/testimonials/${t.id}`} className="hover:underline">
                  {t.authorName}
                </a>
              </td>
              <td>{t.rating ?? "—"}</td>
              <td>{t.order}</td>
              <td>{t.isActive ? "Active" : "Hidden"}</td>
              <td className="space-x-3">
                <form action={toggleTestimonialActive.bind(null, t.id)} className="inline">
                  <button type="submit" className="text-xs text-brand-navy hover:underline">
                    {t.isActive ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteTestimonial.bind(null, t.id)} className="inline">
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {testimonials.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-slate-500">
                None yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
