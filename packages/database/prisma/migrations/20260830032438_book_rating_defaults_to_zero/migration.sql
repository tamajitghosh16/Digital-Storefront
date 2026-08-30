/*
  Warnings:

  - Made the column `ratingAvg` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill existing NULLs (rows created before this column had a default)
-- before making it required.
UPDATE "products" SET "ratingAvg" = 0 WHERE "ratingAvg" IS NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "ratingAvg" SET NOT NULL,
ALTER COLUMN "ratingAvg" SET DEFAULT 0;
