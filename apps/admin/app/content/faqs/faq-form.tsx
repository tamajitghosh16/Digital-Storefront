import type { Faq } from "@repo/database";

const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

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
    <form action={action} className="mt-6 max-w-md space-y-4">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Field label="Question">
        <input name="question" defaultValue={faq?.question} className={inputClass} required />
      </Field>
      <Field label="Answer">
        <textarea name="answer" defaultValue={faq?.answer} className={inputClass} rows={4} required />
      </Field>
      <Field label="Order (lower = earlier)">
        <input name="order" type="number" defaultValue={faq?.order ?? 0} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={faq?.isActive ?? true} />
        Active
      </label>

      <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
        {faq ? "Save changes" : "Add FAQ"}
      </button>
    </form>
  );
}
