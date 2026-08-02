import Link from "next/link";
import type { NavLink } from "@repo/database";
import { CheckboxField, ErrorBanner, Section, SelectField, TextField } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";

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
    <form action={action} className="max-w-2xl space-y-5">
      <ErrorBanner message={error} />

      <Section title="Where this link goes" description="Menu links can point at a page on your site or anywhere else.">
        <TextField
          label="Wording"
          help="What visitors see and click."
          name="label"
          required
          defaultValue={link?.label}
          placeholder="Books"
        />
        <TextField
          label="Goes to"
          help="A page on your site starts with a slash, like /books. You can also use a full web address or mailto:you@example.com."
          name="href"
          required
          defaultValue={link?.href}
          placeholder="/books"
        />
        <SelectField label="Where it appears" name="location" defaultValue={link?.location ?? "HEADER"} required>
          <option value="HEADER">Top of the page</option>
          <option value="FOOTER">Footer</option>
        </SelectField>
        <TextField
          label="Position"
          help="Lower numbers appear first."
          name="order"
          type="number"
          defaultValue={link?.order ?? 0}
        />
        <CheckboxField label="Show this link" name="isActive" defaultChecked={link?.isActive ?? true} />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton>{link ? "Save changes" : "Add link"}</SaveButton>
        <Link href="/settings/navigation" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
