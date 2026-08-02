import Link from "next/link";
import type { Faq } from "@repo/database";
import { CheckboxField, ErrorBanner, Section, TextAreaField, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";

export function FaqForm({
  action,
  faq,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  faq?: Faq;
  error?: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <ErrorBanner message={error} />

      <Section title="The question and answer" description="Shown in the questions section near the bottom of the homepage.">
        <TextField
          label="Question"
          name="question"
          required
          defaultValue={faq?.question}
          placeholder="How long does delivery take?"
        />
        <TextAreaField
          label="Answer"
          help="Plain sentences. A short paragraph is easier to read than a long one."
          name="answer"
          rows={5}
          required
          defaultValue={faq?.answer}
        />
        <TextField
          label="Position in the list"
          help="Lower numbers appear first."
          name="order"
          type="number"
          defaultValue={faq?.order ?? 0}
        />
        <CheckboxField
          label="Show this question on the site"
          name="isActive"
          defaultChecked={faq?.isActive ?? true}
        />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton>{faq ? "Save changes" : "Add question"}</SaveButton>
        <Link href="/content/faqs" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
