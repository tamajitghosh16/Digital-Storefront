"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { menuProductFormSchema } from "./schema";

// Create-only for now — no edit/delete yet, same scope as ./categories/actions.ts.
export async function createMenuProduct(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = menuProductFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/menu/products?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const category = await prisma.menuCategory.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    redirect(`/menu/products?error=${encodeURIComponent("Pick a category")}`);
  }

  const existing = await prisma.menuProduct.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    redirect(`/menu/products?error=${encodeURIComponent("That web address is already used by another product")}`);
  }

  const product = await prisma.menuProduct.create({ data: parsed.data });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      action: "menu_product.created",
      entity: "MenuProduct",
      entityId: product.id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/menu/products");
  revalidatePath("/", "layout");
  redirect("/menu/products?created=1");
}
