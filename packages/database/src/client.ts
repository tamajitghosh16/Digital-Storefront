import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Standard Next.js-safe Prisma singleton: avoids exhausting the connection
// pool from hot-reloading in dev, where every file save would otherwise
// instantiate a new PrismaClient.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires an explicit driver adapter at runtime — the schema no
// longer carries a connection string. Pooled (Supavisor), matching the app's
// runtime query pattern; migrations use DIRECT_URL via prisma.config.ts instead.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";

/**
 * SiteSettings is a singleton row — always read/written at this fixed id
 * rather than via findFirst, so both apps agree on "the" settings row
 * without a race on which one is "first".
 */
export const SITE_SETTINGS_ID = "singleton";

/** Fallback used until apps/admin's Site Settings screen has ever been saved. */
const DEFAULT_SITE_SETTINGS = {
  id: SITE_SETTINGS_ID,
  siteName: "Shashibhushan's New School Book Press",
  tagline: null as string | null,
  metaTitle: null as string | null,
  metaDescription: "Physical books, e-books, self-publishing, and e-book creation services.",
  ogImageUrl: null as string | null,
  logoUrl: null as string | null,
  contactEmail: null as string | null,
  contactPhone: null as string | null,
  addressLine: null as string | null,
  socialLinks: null as unknown,
  updatedAt: new Date(0),
};

/** Read the singleton SiteSettings row, or a sane default if admin hasn't saved one yet. */
export async function getSiteSettings() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
  return settings ?? DEFAULT_SITE_SETTINGS;
}

// ── Admin-editable copy and pricing ─────────────────────────────────
// Both readers swallow database errors and fall back to the values this
// build shipped with. That's deliberate and matches apps/web's existing
// withFallback() posture: a storefront that renders last-known-good copy
// beats one that 500s because a settings row is missing.

export * from "./content";
export * from "./pricing";

import { mergeContent, type ContentMap } from "./content";
import {
  DEFAULT_PRICING_CONFIG,
  PRICING_SETTINGS_ID,
  bpsToRate,
  type PricingConfig,
} from "./pricing";

/** Every storefront copy string, with the Publisher's overrides applied. */
export async function getContent(): Promise<ContentMap> {
  try {
    const rows = await prisma.contentBlock.findMany();
    return mergeContent(rows);
  } catch {
    return mergeContent([]);
  }
}

/** The pricing rules the Publisher controls, as one serializable object. */
export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const [settings, tiers, codes] = await Promise.all([
      prisma.pricingSettings.findUnique({ where: { id: PRICING_SETTINGS_ID } }),
      prisma.classSetTier.findMany({ where: { isActive: true }, orderBy: { quantity: "asc" } }),
      prisma.discountCode.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    ]);

    const base = settings
      ? {
          delivery: {
            freeOverCents: settings.freeDeliveryOverCents,
            expressFeeCents: settings.expressFeeCents,
            sameDayFeeCents: settings.sameDayFeeCents,
            standardEta: settings.standardEta,
            expressEta: settings.expressEta,
            sameDayEta: settings.sameDayEta,
          },
          bundleEbookAddCents: settings.bundleEbookAddCents,
          gstRates: {
            PHYSICAL_BOOK: 0,
            EBOOK: bpsToRate(settings.ebookGstBps),
            SERVICE_PACKAGE: bpsToRate(settings.serviceGstBps),
          },
          classSetBaseCents: settings.classSetBaseCents,
        }
      : {
          delivery: DEFAULT_PRICING_CONFIG.delivery,
          bundleEbookAddCents: DEFAULT_PRICING_CONFIG.bundleEbookAddCents,
          gstRates: DEFAULT_PRICING_CONFIG.gstRates,
          classSetBaseCents: DEFAULT_PRICING_CONFIG.classSetBaseCents,
        };

    return {
      ...base,
      // The single-copy tier is the price everything else is a discount off,
      // so it's synthesised rather than trusted to exist in the table — the
      // buy box indexes tier[0] and must never find it missing.
      classSetTiers: [
        { quantity: 1, discount: 0 },
        ...tiers
          .filter((tier) => tier.quantity > 1)
          .map((tier) => ({ quantity: tier.quantity, discount: bpsToRate(tier.discountBps) })),
      ],
      discountCodes: codes.map((code) => ({
        code: code.code,
        rate: bpsToRate(code.rateBps),
        blurb: code.blurb ?? "",
      })),
    };
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
}
