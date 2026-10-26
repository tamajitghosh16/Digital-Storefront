-- Security hardening (docs/security-roadmap.md, C2 + H3).

-- AlterTable: which order lines grant the e-book file.
ALTER TABLE "order_items" ADD COLUMN     "includesEbook" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every existing DIGITAL line was an e-book purchase. Existing
-- "print + e-book" bundles can't be told apart from print-only lines in old
-- rows (both were SHIP), so they stay false; re-grant any by hand if needed:
--   update order_items set "includesEbook" = true where id in (...);
UPDATE "order_items" SET "includesEbook" = true WHERE "fulfillmentType" = 'DIGITAL';

-- CreateTable: per-customer download counter for e-book files.
CREATE TABLE "library_downloads" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_downloads_fileAssetId_idx" ON "library_downloads"("fileAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "library_downloads_userId_fileAssetId_key" ON "library_downloads"("userId", "fileAssetId");

-- CreateIndex: one Razorpay payment settles at most one order.
CREATE UNIQUE INDEX "payments_gatewayPaymentId_key" ON "payments"("gatewayPaymentId");

-- AddForeignKey
ALTER TABLE "library_downloads" ADD CONSTRAINT "library_downloads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_downloads" ADD CONSTRAINT "library_downloads_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
