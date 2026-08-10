"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { categoryFormSchema } from "./schema";

// Create-only for now — no edit/delete yet, see apps/admin/app/menu/products/actions.ts.
export async function createMenuCategory(formData: FormData) {
  const user = await getCurrentUser();
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
