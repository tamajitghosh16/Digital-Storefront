-- A signed-in customer's cart is saved against their account, so it shows on
-- every browser/device they sign in on. Additive.

-- CreateTable
CREATE TABLE "carts" (
    "userId" UUID NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma only; never reachable over the Data API (see lock_down_data_api).
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
