import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default function SelfPublishingPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Self Publishing" description="Services → Self Publishing, as it appears in the storefront's menu bar." />
      <EmptyState
        title="Not built yet"
        description="A dedicated inventory view for this department hasn't been built yet. Self-publishing submissions are tracked separately under Submissions."
        action={<ButtonLink href="/submissions">Go to submissions</ButtonLink>}
      />
    </div>
  );
}
