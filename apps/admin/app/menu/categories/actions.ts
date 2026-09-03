"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { categoryFormSchema } from "./schema";

// Create-only for now — no edit/delete yet, see apps/admin/app/menu/products/actions.ts.
export async function createMenuCategory(formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = categoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/menu/categories?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const existing = await prisma.menuCategory.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    redirect(`/menu/categories?error=${encodeURIComponent("That web address is already used by another category")}`);
  }

  const category = await prisma.menuCategory.create({ data: parsed.data });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "menu_category.created",
      entity: "MenuCategory",
      entityId: category.id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/menu/categories");
  revalidatePath("/", "layout");
  redirect("/menu/categories?created=1");
}

/**
 * The Status switch on each row. Two targets, because the list mixes two
 * kinds of category: an operator-added `MenuCategory` (toggle its
 * `isActive`) and a built-in department that only exists in code (record a
 * `DepartmentVisibility` row so apps/web's `buildDepartments()` can drop
 * it). Both write an audit row and refresh the storefront's cached layout.
 */
export async function setMenuCategoryVisibility(id: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const visible = formData.get("visible") === "true";

  const category = await prisma.menuCategory.update({
    where: { id },
    data: { isActive: visible },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: visible ? "menu_category.shown" : "menu_category.hidden",
      entity: "MenuCategory",
      entityId: category.id,
      diff: { isActive: visible } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/menu/categories");
  revalidatePath("/", "layout");
  redirect("/menu/categories?visibility=1");
}

export async function setDepartmentVisibility(key: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const visible = formData.get("visible") === "true";

  await prisma.departmentVisibility.upsert({
    where: { key },
    create: { key, hidden: !visible },
    update: { hidden: !visible },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: visible ? "department.shown" : "department.hidden",
      entity: "DepartmentVisibility",
      entityId: key,
      diff: { hidden: !visible } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/menu/categories");
  revalidatePath("/", "layout");
  redirect("/menu/categories?visibility=1");
}
