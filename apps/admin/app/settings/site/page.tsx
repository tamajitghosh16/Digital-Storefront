import { prisma, SITE_SETTINGS_ID } from "@repo/database";
import { updateSiteSettings } from "./actions";

const inputClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export default async function SiteSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const settings = await prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
  const social = (settings?.socialLinks as { twitter?: string; facebook?: string; instagram?: string } | null) ?? {};

  return (
    <div>
      <h1 className="text-2xl font-bold">Site Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Controls apps/web&apos;s global branding, default SEO metadata, and contact/social info.
      </p>

      <form action={updateSiteSettings} className="mt-6 max-w-2xl space-y-4">
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Field label="Site name">
          <input name="siteName" defaultValue={settings?.siteName ?? "Shashibhushan's New School Book Press"} className={inputClass} required />
        </Field>
        <Field label="Tagline">
          <input name="tagline" defaultValue={settings?.tagline ?? ""} className={inputClass} />
        </Field>
        <Field label="Meta title (SEO, homepage default)">
          <input name="metaTitle" defaultValue={settings?.metaTitle ?? ""} className={inputClass} />
        </Field>
        <Field label="Meta description (SEO, homepage default)">
          <textarea name="metaDescription" defaultValue={settings?.metaDescription ?? ""} className={inputClass} rows={2} />
        </Field>
        <Field label="OG image URL (social share preview)">
          <input name="ogImageUrl" defaultValue={settings?.ogImageUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="Logo URL">
          <input name="logoUrl" defaultValue={settings?.logoUrl ?? ""} className={inputClass} />
        </Field>
        <Field label="Contact email">
          <input name="contactEmail" type="email" defaultValue={settings?.contactEmail ?? ""} className={inputClass} />
        </Field>
        <Field label="Contact phone">
          <input name="contactPhone" defaultValue={settings?.contactPhone ?? ""} className={inputClass} />
        </Field>
        <Field label="Address">
          <input name="addressLine" defaultValue={settings?.addressLine ?? ""} className={inputClass} />
        </Field>
        <Field label="Twitter/X URL">
          <input name="twitterUrl" defaultValue={social.twitter ?? ""} className={inputClass} />
        </Field>
        <Field label="Facebook URL">
          <input name="facebookUrl" defaultValue={social.facebook ?? ""} className={inputClass} />
        </Field>
        <Field label="Instagram URL">
          <input name="instagramUrl" defaultValue={social.instagram ?? ""} className={inputClass} />
        </Field>

        <button type="submit" className="rounded bg-brand-navy px-4 py-2 text-sm text-white">
          Save settings
        </button>
      </form>
    </div>
  );
}
