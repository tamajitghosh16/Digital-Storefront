import { createNavLink } from "../actions";
import { NavLinkForm } from "../nav-link-form";

export default async function NewNavLinkPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold">New Nav Link</h1>
      <NavLinkForm action={createNavLink} error={error} />
    </div>
  );
}
