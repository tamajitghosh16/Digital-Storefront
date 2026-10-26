-- Checkout: addresses gain a district, an order keeps a snapshot of the
-- delivery address (and optional GSTIN) it was placed with, and cash on
-- delivery becomes a payment method. All additive.

ALTER TYPE "PaymentMethod" ADD VALUE 'COD';

ALTER TABLE "addresses" ADD COLUMN "district" TEXT;

ALTER TABLE "orders" ADD COLUMN "shippingAddress" JSONB,
ADD COLUMN "gstNumber" TEXT;
