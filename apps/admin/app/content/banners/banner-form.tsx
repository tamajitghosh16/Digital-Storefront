import Link from "next/link";
import type { Banner } from "@repo/database";
import { CheckboxField, ErrorBanner, FieldRow, Section, TextAreaField, TextField } from "@/components/ui";
import { ImageField } from "@/components/image-field";
import { SaveButton } from "@/components/form-controls";

/**
 * The homepage hero, edited as what it looks like on the page — a small
 * label, a headline, a paragraph, and up to two buttons — rather than as a
 * list of database columns.
 */
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
    <form action={action} className="max-w-3xl space-y-5">
      <ErrorBanner message={error} />

      <Section
        title="The words"
        description="This is the first thing anyone reads on your site. Keep the headline short and say what you do."
      >
        <TextField
          label="Small label above the headline"
          help="Optional. Something like “New this season”."
          name="eyebrow"
          defaultValue={banner?.eyebrow ?? ""}
          placeholder="New this season"
        />
        <TextField
          label="Headline"
          name="title"
          required
          defaultValue={banner?.title}
          placeholder="Your story, published your way."
        />
        <TextAreaField
          label="Paragraph under the headline"
          help="One or two sentences."
          name="subtitle"
          rows={3}
          defaultValue={banner?.subtitle ?? ""}
          placeholder="Shop the catalogue, commission an e-book conversion, or launch your own title."
        />
      </Section>

      <Section
        title="Buttons"
        description="Leave a button's text empty to hide it. Links starting with / point at a page on your own site."
      >
        <FieldRow>
          <TextField
            label="Main button text"
            name="ctaText"
            defaultValue={banner?.ctaText ?? ""}
            placeholder="Start self-publishing"
          />
          <TextField
            label="Main button link"
            name="ctaHref"
            defaultValue={banner?.ctaHref ?? ""}
            placeholder="/self-publishing"
          />
          <TextField
            label="Second button text"
            help="Optional."
            name="secondaryCtaText"
            defaultValue={banner?.secondaryCtaText ?? ""}
            placeholder="Shop books"
          />
          <TextField
            label="Second button link"
            name="secondaryCtaHref"
            defaultValue={banner?.secondaryCtaHref ?? ""}
            placeholder="/books"
          />
        </FieldRow>
      </Section>

      <Section
        title="Picture and position"
        description="The hero shows a fan of book covers by default. A picture here is used by promo banners elsewhere on the site."
      >
        <ImageField
          name="imageUrl"
          label="Banner picture"
          help="Optional. Wide images work best."
          defaultValue={banner?.imageUrl}
          shape="wide"
        />
        <TextField
          label="Position"
          help="The lowest number is the one shown as the hero at the top of the homepage."
          name="order"
          type="number"
          defaultValue={banner?.order ?? 0}
        />
        <CheckboxField
          label="Use this banner"
          help="Untick to keep it on the list without showing it on the site."
          name="isActive"
          defaultChecked={banner?.isActive ?? true}
        />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton>{banner ? "Save changes" : "Add banner"}</SaveButton>
        <Link href="/content/banners" className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
