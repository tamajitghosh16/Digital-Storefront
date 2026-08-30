-- CreateEnum
CREATE TYPE "ProductLine" AS ENUM ('BOOK', 'EDUCATIONAL_CHART', 'WORKSHEET_ACTIVITY_PUZZLE', 'TEACHING_LEARNING_MATERIAL', 'ADVOCATE_DIARY', 'NAYA_BANDHU_APP', 'DIGITAL_TRACKING_SYSTEM', 'INDOOR_PLANT');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "productLine" "ProductLine";

-- CreateIndex
CREATE INDEX "products_productLine_idx" ON "products"("productLine");

-- Backfill: every existing physical/e-book row is a "Books" product line.
-- SERVICE_PACKAGE rows are left null — they're e-book conversion packages,
-- outside the 8-line department taxonomy (see ProductLine's schema comment).
UPDATE "products" SET "productLine" = 'BOOK' WHERE "type" IN ('PHYSICAL_BOOK', 'EBOOK');
