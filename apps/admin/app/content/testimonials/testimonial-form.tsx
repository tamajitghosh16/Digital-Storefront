import Link from "next/link";
import type { Testimonial } from "@repo/database";
import { CheckboxField, ErrorBanner, FieldRow, Section, SelectField, TextAreaField, TextField } from "@/components/ui";
import { ImageField } from "@/components/image-field";
import { SaveButton } from "@/components/form-controls";

export function TestimonialForm({
  action,
  testimonial,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  testimonial?: Testimonial;
  error?: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <ErrorBanner message={error} />

      <Section title="The quote" description="Shown as a card on the homepage, under “From our readers & authors”.">
        <TextAreaField
          label="What they said"
          name="quote"
          rows={4}
          required
          defaultValue={testimonial?.quote}
          placeholder="They turned my manuscript into a finished book in three weeks."
        />
        <FieldRow>
          <TextField
            label="Who said it"
            name="authorName"
            required
            defaultValue={testimonial?.authorName}
            placeholder="Ananya Sen"
          />
          <SelectField
            label="Stars"
            help="Leave as five unless there's a reason not to."
            name="rating"
            defaultValue={testimonial?.rating ?? 5}
          >
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>
                {"★".repeat(stars)} ({stars})
              </option>
            ))}
          </SelectField>
        </FieldRow>

        <ImageField
          name="imageUrl"
          label="Photo"
          help="Optional."
          defaultValue={testimonial?.imageUrl}
          shape="square"
        />

        <TextField
          label="Position in the list"
          help="Lower numbers appear first."
          name="order"
          type="number"
          defaultValue={testimonial?.order ?? 0}
        />
        <CheckboxField
          label="Show this on the site"
          name="isActive"
          defaultChecked={testimonial?.isActive ?? true}
        />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton>{testimonial ? "Save changes" : "Add testimonial"}</SaveButton>
        <Link href="/content/testimonials" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
