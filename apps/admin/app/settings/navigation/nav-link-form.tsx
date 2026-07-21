import type { NavLink } from "@repo/database";

const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function NavLinkForm({
  action,
  link,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  link?: NavLink;
  error?: string;
}) {
  return (
    <form action={action} className="mt-6 max-w-md space-y-4">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Field label="Label">
        <input name="label" defaultValue={link?.label} className={inputClass} required />
      </Field>
      <Field label="Link target (e.g. /books or mailto:...)">
        <input name="href" defaultValue={link?.href} className={inputClass} required />
      </Field>
      <Field label="Location">
        <select name="location" defaultValue={link?.location ?? "HEADER"} className={inputClass} required>
          <option value="HEADER">Header</option>
          <option value="FOOTER">Footer</option>
        </select>
      </Field>
      <Field label="Order (lower = earlier)">
        <input name="order" type="number" defaultValue={link?.order ?? 0} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={link?.isActive ?? true} />
        Active
      </label>

      <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
        {link ? "Save changes" : "Add link"}
      </button>
    </form>
  );
}
