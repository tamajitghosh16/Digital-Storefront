import type { Banner } from "@repo/database";

const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function BannerForm({
  action,
  banner,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  banner?: Banner;
  error?: string;
}) {
  return (
    <form action={action} className="mt-6 max-w-md space-y-4">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Field label="Title">
        <input name="title" defaultValue={banner?.title} className={inputClass} required />
      </Field>
      <Field label="Subtitle">
        <input name="subtitle" defaultValue={banner?.subtitle ?? ""} className={inputClass} />
      </Field>
      <Field label="Image URL">
        <input name="imageUrl" defaultValue={banner?.imageUrl ?? ""} className={inputClass} />
      </Field>
      <Field label="CTA text">
        <input name="ctaText" defaultValue={banner?.ctaText ?? ""} className={inputClass} />
      </Field>
      <Field label="CTA link">
        <input name="ctaHref" defaultValue={banner?.ctaHref ?? ""} className={inputClass} />
      </Field>
      <Field label="Order (lower = earlier)">
        <input name="order" type="number" defaultValue={banner?.order ?? 0} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={banner?.isActive ?? true} />
        Active
      </label>

      <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
        {banner ? "Save changes" : "Add banner"}
      </button>
    </form>
  );
}
