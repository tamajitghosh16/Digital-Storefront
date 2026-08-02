import { prisma, SITE_SETTINGS_ID } from "@repo/database";
import { ErrorBanner, FieldRow, PageHeader, SavedBanner, Section, TextAreaField, TextField } from "@/components/ui";
import { ImageField } from "@/components/image-field";
import { SaveButton } from "@/components/form-controls";
import { updateSiteSettings } from "./actions";

// The screen behind apps/web's root layout: name and logo in the header,
// contact details and social links in the footer, and the default title and
// description search engines show for the site as a whole.
export default async function SiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const settings = await prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
  const social = (settings?.socialLinks as { twitter?: string; facebook?: string; instagram?: string } | null) ?? {};

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Site details"
        description="Your shop's name, logo, contact details and social links — used across the whole website."
      />

      <form action={updateSiteSettings} className="space-y-5">
        <ErrorBanner message={error} />
        {saved && <SavedBanner message="Site details saved." />}

        <Section title="Name and logo" description="Shown in the header of every page.">
          <TextField
            label="Shop name"
            name="siteName"
            required
            defaultValue={settings?.siteName ?? "Shashibhushan's New School Book Press"}
          />
          <TextField
            label="Tagline"
            help="Optional. A short line under the name."
            name="tagline"
            defaultValue={settings?.tagline ?? ""}
          />
          <ImageField
            name="logoUrl"
            label="Logo"
            help="Leave empty to use the logo built into the site. If yours is an SVG file, use “Use a link instead”."
            defaultValue={settings?.logoUrl}
            shape="wide"
          />
        </Section>

        <Section
          title="Contact details"
          description="Shown in the footer so customers know how to reach you."
        >
          <FieldRow>
            <TextField label="Email" name="contactEmail" type="email" defaultValue={settings?.contactEmail ?? ""} />
            <TextField label="Phone" name="contactPhone" defaultValue={settings?.contactPhone ?? ""} />
          </FieldRow>
          <TextField label="Address" name="addressLine" defaultValue={settings?.addressLine ?? ""} />
        </Section>

        <Section title="Social links" description="Leave any of these empty to hide that icon in the footer.">
          <FieldRow>
            <TextField label="Twitter / X" name="twitterUrl" type="url" defaultValue={social.twitter ?? ""} placeholder="https://x.com/…" />
            <TextField label="Facebook" name="facebookUrl" type="url" defaultValue={social.facebook ?? ""} placeholder="https://facebook.com/…" />
            <TextField label="Instagram" name="instagramUrl" type="url" defaultValue={social.instagram ?? ""} placeholder="https://instagram.com/…" />
          </FieldRow>
        </Section>

        <Section
          title="How the site appears in Google and when shared"
          description="Only the site as a whole — individual books have their own settings on the book's own page."
        >
          <TextField
            label="Title in search results"
            help="Leave empty to use the shop name."
            name="metaTitle"
            defaultValue={settings?.metaTitle ?? ""}
          />
          <TextAreaField
            label="Description in search results"
            help="Around 150 characters."
            name="metaDescription"
            rows={2}
            defaultValue={settings?.metaDescription ?? ""}
          />
          <ImageField
            name="ogImageUrl"
            label="Picture when the site is shared"
            help="Optional. Wide images (about 1200×630) work best."
            defaultValue={settings?.ogImageUrl}
            shape="wide"
          />
        </Section>

        <div className="sticky bottom-4 flex items-center gap-3 rounded-tile border border-line bg-ground/95 p-4 backdrop-blur">
          <SaveButton>Save site details</SaveButton>
        </div>
      </form>
    </div>
  );
}
