-- Checkout: an order keeps a snapshot of the billing address it was placed
-- with, next to the delivery one. Additive.

ALTER TABLE "orders" ADD COLUMN "billingAddress" JSONB;
