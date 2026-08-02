import { PageHeader } from "@/components/ui";
import { createNavLink } from "../actions";
import { NavLinkForm } from "../nav-link-form";

export default async function NewNavLinkPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Add a menu link" backHref="/settings/navigation" backLabel="Menu links" />
      <NavLinkForm action={createNavLink} error={error} />
    </div>
  );
}
