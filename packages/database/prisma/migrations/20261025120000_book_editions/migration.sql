-- Book formats: Paperback / Hardcover / E-book, each its own priced (and,
-- for print, stocked) BookEdition row. Replaces products."bookFormats"
-- (PHYSICAL | EBOOK) and products."ebookPriceCents".
--
-- Backfill: an existing PHYSICAL format becomes a PAPERBACK edition at the
-- row's priceCents/stockQty; EBOOK becomes an EBOOK edition at
-- ebookPriceCents (dual-format rows) or priceCents (e-book-only rows).
-- Legacy BOOK rows with no bookFormats fall back to their `type`.

-- 1. New enum (the old one is dropped at the end, once nothing uses it).
ALTER TYPE "BookFormat" RENAME TO "BookFormat_old";
CREATE TYPE "BookFormat" AS ENUM ('PAPERBACK', 'HARDCOVER', 'EBOOK');

-- 2. Editions table.
CREATE TABLE "book_editions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "format" "BookFormat" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stockQty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_editions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_editions_productId_format_key" ON "book_editions"("productId", "format");
CREATE INDEX "book_editions_format_idx" ON "book_editions"("format");

ALTER TABLE "book_editions" ADD CONSTRAINT "book_editions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same posture as every other public table (see lock_down_data_api and
-- prisma/sql/auto_enable_rls.sql): RLS on, no Data API grants.
ALTER TABLE "book_editions" ENABLE ROW LEVEL SECURITY;

-- 3. Backfill editions from the old columns.
INSERT INTO "book_editions" ("id", "productId", "format", "priceCents", "stockQty", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'PAPERBACK', p."priceCents", p."stockQty", CURRENT_TIMESTAMP
FROM "products" p
WHERE 'PHYSICAL' = ANY (p."bookFormats"::text[])
   OR (p."productLine" = 'BOOK' AND cardinality(p."bookFormats") = 0 AND p."type" = 'PHYSICAL_BOOK');

INSERT INTO "book_editions" ("id", "productId", "format", "priceCents", "stockQty", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'EBOOK',
       CASE WHEN 'PHYSICAL' = ANY (p."bookFormats"::text[]) THEN COALESCE(p."ebookPriceCents", p."priceCents") ELSE p."priceCents" END,
       NULL, CURRENT_TIMESTAMP
FROM "products" p
WHERE 'EBOOK' = ANY (p."bookFormats"::text[])
   OR (p."productLine" = 'BOOK' AND cardinality(p."bookFormats") = 0 AND p."type" = 'EBOOK');

-- A book's priceCents is now its cheapest edition's price, and its stock
-- lives on the printed editions only.
UPDATE "products" p
SET "priceCents" = e."minPrice"
FROM (SELECT "productId", MIN("priceCents") AS "minPrice" FROM "book_editions" GROUP BY "productId") e
WHERE e."productId" = p."id";

UPDATE "products" p
SET "stockQty" = NULL
WHERE EXISTS (SELECT 1 FROM "book_editions" e WHERE e."productId" = p."id");

-- 4. Which edition an order line / purchase-order line is for.
ALTER TABLE "order_items" ADD COLUMN "bookFormat" "BookFormat";
ALTER TABLE "purchase_order_items" ADD COLUMN "bookFormat" "BookFormat";

UPDATE "order_items" oi
SET "bookFormat" = CASE WHEN oi."fulfillmentType" = 'DIGITAL' THEN 'EBOOK'::"BookFormat" ELSE 'PAPERBACK'::"BookFormat" END
WHERE EXISTS (SELECT 1 FROM "book_editions" e WHERE e."productId" = oi."productId");

UPDATE "purchase_order_items" poi
SET "bookFormat" = 'PAPERBACK'
WHERE EXISTS (SELECT 1 FROM "book_editions" e WHERE e."productId" = poi."productId" AND e."format" = 'PAPERBACK');

-- 5. Drop the old columns and enum.
ALTER TABLE "products" DROP COLUMN "bookFormats";
ALTER TABLE "products" DROP COLUMN "ebookPriceCents";
DROP TYPE "BookFormat_old";
