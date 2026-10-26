"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { discountCodeFormSchema, toDiscountCodeData } from "./schema";

// Discount codes shoppers type in the storefront cart. Gated on
// CATALOGUE_WRITE_ROLES, like the rest of pricing: a code changes what
// customers are charged. No revalidateStorefront() — apps/web never caches
// codes; checkout looks each one up live (apps/web/lib/discounts.ts).

/** `never` so TypeScript narrows a failed safeParse away at the call site. */
function back(params: string): never {
  redirect(`/discounts?${params}`);
}

async function requireDiscountWriter() {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);
  return user!;
}

async function audit(
  actor: { id: string; email: string },
  action: string,
  entityId: string,
  diff: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: { actorId: actor.id, actorEmail: actor.email, action, entity: "DiscountCode", entityId, diff },
  });
}

export async function createDiscountCode(formData: FormData) {
  const user = await requireDiscountWriter();

  const parsed = discountCodeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(`error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);

  const data = toDiscountCodeData(parsed.data);
  const existing = await prisma.discountCode.findUnique({ where: { code: data.code } });
  if (existing) back(`error=${encodeURIComponent(`The code ${data.code} already exists.`)}`);

  const created = await prisma.discountCode.create({ data });
  await audit(user, "discount_code.created", created.id, {
    ...data,
    startsAt: data.startsAt?.toISOString() ?? null,
    expiresAt: data.expiresAt?.toISOString() ?? null,
  });

  revalidatePath("/discounts");
  back(`created=${encodeURIComponent(data.code)}`);
}

export async function toggleDiscountCode(id: string) {
  const user = await requireDiscountWriter();

  const existing = await prisma.discountCode.findUniqueOrThrow({ where: { id } });
  await prisma.discountCode.update({ where: { id }, data: { isActive: !existing.isActive } });
  await audit(user, existing.isActive ? "discount_code.turned_off" : "discount_code.turned_on", id, {
    code: existing.code,
    isActive: !existing.isActive,
  });

  revalidatePath("/discounts");
}

/**
 * Orders that used the code keep its name (`Order.discountCode`) and the
 * amount it took off; only the link to this row is cleared.
 */
export async function deleteDiscountCode(id: string) {
  const user = await requireDiscountWriter();

  const code = await prisma.discountCode.delete({ where: { id } });
  await audit(user, "discount_code.deleted", id, { code: code.code });

  revalidatePath("/discounts");
}
