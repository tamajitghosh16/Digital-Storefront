import Link from "next/link";
import { prisma } from "@repo/database";
import { ButtonLink, EmptyState, PageHeader, Pill, Table } from "@/components/ui";
import { ConfirmButton, LinkButton } from "@/components/form-controls";
import { deleteTestimonial, toggleTestimonialActive } from "./actions";

export default async function TestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Testimonials"
        description="Quotes from readers and authors, shown as cards on the homepage."
        action={<ButtonLink href="/content/testimonials/new">Add a testimonial</ButtonLink>}
      />

      {testimonials.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          description="Add a few quotes from happy readers or authors. The section stays hidden on the homepage until there's at least one."
          action={<ButtonLink href="/content/testimonials/new">Add a testimonial</ButtonLink>}
        />
      ) : (
        <Table
          head={
            <>
              <th>Quote</th>
              <th>Stars</th>
              <th>Position</th>
              <th>Status</th>
              <th className="text-right">&nbsp;</th>
            </>
          }
        >
          {testimonials.map((testimonial) => (
            <tr key={testimonial.id}>
              <td>
                <Link
                  href={`/content/testimonials/${testimonial.id}`}
                  className="font-semibold text-ink hover:text-brand hover:underline"
                >
                  {testimonial.authorName}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{testimonial.quote}</p>
              </td>
              <td className="whitespace-nowrap text-warn">{"★".repeat(testimonial.rating ?? 5)}</td>
              <td className="tabular-nums text-ink-muted">{testimonial.order}</td>
              <td>
                <Pill tone={testimonial.isActive ? "on" : "off"}>
                  {testimonial.isActive ? "Showing" : "Hidden"}
                </Pill>
              </td>
              <td className="space-x-4 text-right">
                <form action={toggleTestimonialActive.bind(null, testimonial.id)} className="inline">
                  <LinkButton>{testimonial.isActive ? "Hide" : "Show"}</LinkButton>
                </form>
                <form action={deleteTestimonial.bind(null, testimonial.id)} className="inline">
                  <ConfirmButton message={`Delete the testimonial from ${testimonial.authorName}?`}>
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
