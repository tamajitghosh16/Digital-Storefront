-- Discount codes grow from "x% off" into real coupon rules (flat or percent,
-- minimum order, cap, validity window, usage limits), and an order records
-- the code and the amount it took off. All additive: existing codes keep
-- working as uncapped, unlimited, always-on percent codes.

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FLAT');

-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "amountOffCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "maxDiscountCents" INTEGER,
ADD COLUMN     "minOrderCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "perCustomerLimit" INTEGER,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "type" "DiscountType" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "usageLimit" INTEGER,
ALTER COLUMN "rateBps" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "discountCodeId" TEXT;

-- CreateIndex
CREATE INDEX "orders_discountCodeId_idx" ON "orders"("discountCodeId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

