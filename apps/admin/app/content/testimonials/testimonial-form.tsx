import type { Testimonial } from "@repo/database";

const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

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
    <form action={action} className="mt-6 max-w-md space-y-4">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Field label="Author name">
        <input name="authorName" defaultValue={testimonial?.authorName} className={inputClass} required />
      </Field>
      <Field label="Quote">
        <textarea name="quote" defaultValue={testimonial?.quote} className={inputClass} rows={3} required />
      </Field>
      <Field label="Rating (1-5)">
        <input name="rating" type="number" min="1" max="5" defaultValue={testimonial?.rating ?? ""} className={inputClass} />
      </Field>
      <Field label="Image URL">
        <input name="imageUrl" defaultValue={testimonial?.imageUrl ?? ""} className={inputClass} />
      </Field>
      <Field label="Order (lower = earlier)">
        <input name="order" type="number" defaultValue={testimonial?.order ?? 0} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={testimonial?.isActive ?? true} />
        Active
      </label>

      <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
        {testimonial ? "Save changes" : "Add testimonial"}
      </button>
    </form>
  );
}
