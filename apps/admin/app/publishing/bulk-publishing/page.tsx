import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default function BulkPublishingPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader title="Bulk Publishing" description="Services → Bulk Publishing, as it appears in the storefront's menu bar." />
      <EmptyState
        title="Not built yet"
        description="A dedicated inventory view for this department hasn't been built yet. Manage individual products from Books in the meantime."
        action={<ButtonLink href="/educational-material/books">Go to Books</ButtonLink>}
      />
    </div>
  );
}
