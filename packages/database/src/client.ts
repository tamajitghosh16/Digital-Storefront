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
