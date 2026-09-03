"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PRICING_SETTINGS_ID, prisma, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import {
  classSetTierFormSchema,
  discountCodeFormSchema,
  pricingSettingsFormSchema,
  toBps,
  toCents,
} from "./schema";

// FR-11.1: pricing rules that aren't per-product — delivery, the print +
// e-book bundle, GST, class-set quantity breaks, and discount codes. Gated on
// CATALOGUE_WRITE_ROLES rather than CONTENT_WRITE_ROLES because these change
// what customers are charged, not what they read.

/** `never` so TypeScript narrows a failed safeParse away at the call site. */
function back(error?: string): never {
  redirect(error ? `/settings/pricing?error=${encodeURIComponent(error)}` : "/settings/pricing?saved=1");
}

async function requirePricingWriter() {
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
    data: { actorId: actor.id, actorEmail: actor.email, action, entity: "Pricing", entityId, diff },
  });
}

export async function updatePricingSettings(formData: FormData) {
  const user = await requirePricingWriter();

  const parsed = pricingSettingsFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(parsed.error.issues[0]?.message ?? "Invalid input");

  const values = parsed.data;
  const data = {
    freeDeliveryOverCents: toCents(values.freeDeliveryOver),
    expressFeeCents: toCents(values.expressFee),
    sameDayFeeCents: toCents(values.sameDayFee),
    standardEta: values.standardEta,
    expressEta: values.expressEta,
    sameDayEta: values.sameDayEta,
    bundleEbookAddCents: toCents(values.bundleEbookAdd),
    ebookGstBps: toBps(values.ebookGst),
    serviceGstBps: toBps(values.serviceGst),
    classSetBaseCents: toCents(values.classSetBase),
  };

  await prisma.pricingSettings.upsert({
    where: { id: PRICING_SETTINGS_ID },
    update: data,
    create: { id: PRICING_SETTINGS_ID, ...data },
  });

  await audit(user, "pricing.settings_updated", PRICING_SETTINGS_ID, data);

  revalidatePath("/settings/pricing");
  back();
}

export async function saveClassSetTier(formData: FormData) {
  const user = await requirePricingWriter();

  const parsed = classSetTierFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(parsed.error.issues[0]?.message ?? "Invalid input");

  const { quantity, discount } = parsed.data;
  const discountBps = toBps(discount);

  // Keyed on quantity, not on a row id: "10 copies get 12% off" is one fact,
  // and editing it from the add-row form should replace the existing tier
  // rather than fail on the unique constraint.
  await prisma.classSetTier.upsert({
    where: { quantity },
    update: { discountBps, isActive: true },
    create: { quantity, discountBps },
  });

  await audit(user, "pricing.tier_saved", String(quantity), { quantity, discountBps });

  revalidatePath("/settings/pricing");
  back();
}

export async function deleteClassSetTier(id: string) {
  const user = await requirePricingWriter();

  const tier = await prisma.classSetTier.delete({ where: { id } });
  await audit(user, "pricing.tier_deleted", String(tier.quantity), { quantity: tier.quantity });

  revalidatePath("/settings/pricing");
}

export async function createDiscountCode(formData: FormData) {
  const user = await requirePricingWriter();

  const parsed = discountCodeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(parsed.error.issues[0]?.message ?? "Invalid input");

  const { code, rate, blurb } = parsed.data;
  // Stored upper-cased so the cart's lookup can upper-case what the shopper
  // types and match exactly, rather than needing a case-insensitive query.
  const normalised = code.trim().toUpperCase();

  const existing = await prisma.discountCode.findUnique({ where: { code: normalised } });
  if (existing) back(`The code ${normalised} already exists.`);

  await prisma.discountCode.create({
    data: { code: normalised, rateBps: toBps(rate), blurb: blurb ?? null },
  });

  await audit(user, "pricing.code_created", normalised, { code: normalised, rateBps: toBps(rate) });

  revalidatePath("/settings/pricing");
  back();
}

export async function toggleDiscountCode(id: string) {
  const user = await requirePricingWriter();

  const existing = await prisma.discountCode.findUniqueOrThrow({ where: { id } });
  await prisma.discountCode.update({ where: { id }, data: { isActive: !existing.isActive } });

  await audit(user, "pricing.code_toggled", existing.code, { isActive: !existing.isActive });

  revalidatePath("/settings/pricing");
}

export async function deleteDiscountCode(id: string) {
  const user = await requirePricingWriter();

  const code = await prisma.discountCode.delete({ where: { id } });
  await audit(user, "pricing.code_deleted", code.code, { code: code.code });

  revalidatePath("/settings/pricing");
}
