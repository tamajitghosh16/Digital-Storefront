import Link from "next/link";
import { prisma } from "@repo/database";
import { ButtonLink, EmptyState, PageHeader, Pill, Table } from "@/components/ui";
import { ConfirmButton, LinkButton } from "@/components/form-controls";
import { deleteFaq, toggleFaqActive } from "./actions";

export default async function FaqsPage() {
  const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Questions & answers"
        description="The questions shoppers can expand near the bottom of the homepage. The heading above them is under Homepage text."
        action={<ButtonLink href="/content/faqs/new">Add a question</ButtonLink>}
      />

      {faqs.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Add the things customers ask most — delivery times, returns, how self-publishing works."
          action={<ButtonLink href="/content/faqs/new">Add a question</ButtonLink>}
        />
      ) : (
        <Table
          head={
            <>
              <th>Question</th>
              <th>Position</th>
              <th>Status</th>
              <th className="text-right">&nbsp;</th>
            </>
          }
        >
          {faqs.map((faq) => (
            <tr key={faq.id}>
              <td>
                <Link href={`/content/faqs/${faq.id}`} className="font-semibold text-ink hover:text-brand hover:underline">
                  {faq.question}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{faq.answer}</p>
              </td>
              <td className="tabular-nums text-ink-muted">{faq.order}</td>
              <td>
                <Pill tone={faq.isActive ? "on" : "off"}>{faq.isActive ? "Showing" : "Hidden"}</Pill>
              </td>
              <td className="space-x-4 text-right">
                <form action={toggleFaqActive.bind(null, faq.id)} className="inline">
                  <LinkButton>{faq.isActive ? "Hide" : "Show"}</LinkButton>
                </form>
                <form action={deleteFaq.bind(null, faq.id)} className="inline">
                  <ConfirmButton message={`Delete “${faq.question}”? This can't be undone.`}>Delete</ConfirmButton>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
