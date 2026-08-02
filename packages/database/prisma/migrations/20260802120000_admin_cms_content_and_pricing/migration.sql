-- Admin-as-CMS, part 2: storefront copy and pricing become editable rows.
--
-- Purely additive — no column or table is dropped, so this is safe to
-- `migrate deploy` against a live database.
--
-- RLS is deliberately not enabled on these tables, matching the existing
-- CMS tables (banners, faqs, testimonials, nav_links): both apps reach
-- Postgres through Prisma's connection string rather than the Supabase
-- client, and this content is public by definition.

-- AlterTable: the hero banner gains the two fields the homepage was
-- rendering from hardcoded strings.
ALTER TABLE "banners" ADD COLUMN     "eyebrow" TEXT,
ADD COLUMN     "secondaryCtaHref" TEXT,
ADD COLUMN     "secondaryCtaText" TEXT;

-- CreateTable
CREATE TABLE "content_blocks" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "pricing_settings" (
    "id" TEXT NOT NULL,
    "freeDeliveryOverCents" INTEGER NOT NULL DEFAULT 150000,
    "expressFeeCents" INTEGER NOT NULL DEFAULT 14900,
    "sameDayFeeCents" INTEGER NOT NULL DEFAULT 24900,
    "standardEta" TEXT NOT NULL DEFAULT 'in 3-5 working days',
    "expressEta" TEXT NOT NULL DEFAULT 'next working day',
    "sameDayEta" TEXT NOT NULL DEFAULT 'by 9pm today',
    "bundleEbookAddCents" INTEGER NOT NULL DEFAULT 30000,
    "ebookGstBps" INTEGER NOT NULL DEFAULT 1800,
    "serviceGstBps" INTEGER NOT NULL DEFAULT 1800,
    "classSetBaseCents" INTEGER NOT NULL DEFAULT 49900,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_set_tiers" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_set_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "blurb" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_set_tiers_quantity_key" ON "class_set_tiers"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- Seed the rules the storefront previously hardcoded, so behaviour is
-- byte-identical the moment this lands and the Publisher has real values to
-- edit rather than empty screens. `content_blocks` is intentionally left
-- empty: absent means "use the shipped default" (see src/content.ts).
INSERT INTO "pricing_settings" ("id", "updatedAt") VALUES ('singleton', now())
  ON CONFLICT ("id") DO NOTHING;

INSERT INTO "class_set_tiers" ("id", "quantity", "discountBps", "updatedAt") VALUES
  ('seed_tier_10',  10, 1000, now()),
  ('seed_tier_30',  30, 1800, now()),
  ('seed_tier_100', 100, 2400, now())
  ON CONFLICT ("quantity") DO NOTHING;

INSERT INTO "discount_codes" ("id", "code", "rateBps", "blurb", "updatedAt") VALUES
  ('seed_code_school5', 'SCHOOL5', 500, '5% off this order.', now())
  ON CONFLICT ("code") DO NOTHING;
