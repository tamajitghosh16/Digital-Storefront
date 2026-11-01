-- Sales-order approval: the printed part of an order gets its own status
-- (Order.shipmentStatus), which staff move from "awaiting approval" to
-- "delivered" — or refuse — from the admin Sales Orders page. Additive.

CREATE TYPE "ShipmentStatus" AS ENUM ('AWAITING_APPROVAL', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

ALTER TABLE "orders" ADD COLUMN "shipmentStatus" "ShipmentStatus";

CREATE INDEX "orders_shipmentStatus_idx" ON "orders"("shipmentStatus");

-- Backfill every order that ships something and was actually placed — paid
-- online, or cash on delivery. A cancelled checkout that was never paid
-- (an abandoned Razorpay attempt) stays null, so it never shows up as a
-- sales order. Nothing has ever moved an order past PROCESSING by hand, so
-- PAID/PROCESSING orders (COD orders are created PROCESSING) still need
-- staff approval.
UPDATE "orders" o
SET "shipmentStatus" = (CASE o."status"
  WHEN 'SHIPPED' THEN 'SHIPPED'
  WHEN 'DELIVERED' THEN 'DELIVERED'
  WHEN 'CANCELLED' THEN 'CANCELLED'
  WHEN 'REFUNDED' THEN 'CANCELLED'
  ELSE 'AWAITING_APPROVAL'
END)::"ShipmentStatus"
WHERE EXISTS (SELECT 1 FROM "order_items" i WHERE i."orderId" = o."id" AND i."fulfillmentType" = 'SHIP')
  AND o."status" <> 'PENDING'
  AND (
    o."status" <> 'CANCELLED'
    OR EXISTS (
      SELECT 1 FROM "payments" p
      WHERE p."orderId" = o."id" AND (p."status" IN ('CAPTURED', 'REFUNDED') OR p."method" = 'COD')
    )
  );
