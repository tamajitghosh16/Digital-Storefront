-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('BEST_SELLING', 'COMING_SOON', 'OUT_OF_STOCK');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "inventoryStatus" "InventoryStatus";

-- CreateIndex
CREATE INDEX "products_inventoryStatus_idx" ON "products"("inventoryStatus");
