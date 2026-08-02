import { CONTENT_GROUP_LIST, prisma } from "@repo/database";
import { ButtonLink, Field, PageHeader, SavedBanner, Section, controlClass } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";
import { updateHomepageContent } from "./actions";

// FR-11.1-adjacent: the screen that owns every heading, description and
// button label on the storefront homepage. The list of fields is generated
// from the content registry in @repo/database, so adding a piece of editable
// copy is a one-line change there — this page needs no edit.

export default async function HomepageContentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;

  // Raw rows, not getContent(): the form has to distinguish "the Publisher
  // set this to the same words as the default" from "never touched", so it
  // can show defaults as placeholder text rather than as filled-in values.
  const rows = await prisma.contentBlock.findMany().catch(() => []);
  const overrides = new Map(rows.map((row) => [row.key, row.value]));
  const changedCount = CONTENT_GROUP_LIST.flatMap((group) => [...group.entries]).filter((entry) =>
    overrides.has(entry.key)
  ).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Homepage text"
        description="Every heading, description and button label on the homepage. Leave a box empty to go back to the wording the site came with."
        action={<ButtonLink href="/content/banners" variant="secondary">Edit the hero →</ButtonLink>}
      />

      <form action={updateHomepageContent} className="space-y-5">
        {saved && <SavedBanner message="Homepage text saved. Reload the storefront to see it." />}

        <p className="text-sm text-ink-muted">
          {changedCount === 0
            ? "Nothing has been changed from the original wording yet."
            : `${changedCount} ${changedCount === 1 ? "box has" : "boxes have"} been changed from the original wording.`}
        </p>

        {CONTENT_GROUP_LIST.map((group) => (
          <Section key={group.id} title={group.title} description={group.description}>
            {group.entries.map((entry) => {
              const value = overrides.get(entry.key) ?? "";
              const multiline = entry.multiline;

              return (
                <Field key={entry.key} label={entry.label} help={entry.help} htmlFor={entry.key}>
                  {multiline ? (
                    <textarea
                      id={entry.key}
                      name={entry.key}
                      rows={3}
                      defaultValue={value}
                      placeholder={entry.defaultValue}
                      className={controlClass}
                    />
                  ) : (
                    <input
                      id={entry.key}
                      name={entry.key}
                      type="text"
                      defaultValue={value}
                      placeholder={entry.defaultValue}
                      className={controlClass}
                    />
                  )}
                  {!value && (
                    <p className="mt-1 text-[12px] text-ink-subtle">
                      Currently showing the original wording (the grey text above).
                    </p>
                  )}
                </Field>
              );
            })}
          </Section>
        ))}

        <div className="sticky bottom-4 flex items-center gap-3 rounded-tile border border-line bg-ground/95 p-4 backdrop-blur">
          <SaveButton>Save homepage text</SaveButton>
          <p className="text-[13px] text-ink-muted">Changes appear on the storefront immediately.</p>
        </div>
      </form>
    </div>
  );
}
