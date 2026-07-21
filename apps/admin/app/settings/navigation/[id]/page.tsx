import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { updateNavLink } from "../actions";
import { NavLinkForm } from "../nav-link-form";

export default async function EditNavLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const link = await prisma.navLink.findUnique({ where: { id } });
  if (!link) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Nav Link</h1>
      <NavLinkForm action={updateNavLink.bind(null, link.id)} link={link} error={error} />
    </div>
  );
}
