"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CONTENT_WRITE_ROLES } from "@repo/auth/roles";
import { navLinkFormSchema } from "./schema";

export async function createNavLink(formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = navLinkFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/settings/navigation/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const link = await prisma.navLink.create({ data: parsed.data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, actorEmail: user!.email, action: "nav_link.created", entity: "NavLink", entityId: link.id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/settings/navigation");
  redirect("/settings/navigation");
}

export async function updateNavLink(id: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = navLinkFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/settings/navigation/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  await prisma.navLink.update({ where: { id }, data: parsed.data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, actorEmail: user!.email, action: "nav_link.updated", entity: "NavLink", entityId: id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/settings/navigation");
  revalidatePath(`/settings/navigation/${id}`);
  redirect("/settings/navigation");
}

export async function toggleNavLinkActive(id: string) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const existing = await prisma.navLink.findUniqueOrThrow({ where: { id } });
  await prisma.navLink.update({ where: { id }, data: { isActive: !existing.isActive } });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "nav_link.toggled",
      entity: "NavLink",
      entityId: id,
      diff: { isActive: !existing.isActive },
    },
  });

  revalidatePath("/settings/navigation");
}

export async function deleteNavLink(id: string) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  await prisma.navLink.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId: user!.id, actorEmail: user!.email, action: "nav_link.deleted", entity: "NavLink", entityId: id, diff: Prisma.JsonNull },
  });

  revalidatePath("/settings/navigation");
}
