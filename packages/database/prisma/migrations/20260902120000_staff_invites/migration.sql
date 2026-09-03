-- Owner-issued, one-time, 1-hour invitations to the back office. The person
-- redeems one at /join/<token> (apps/admin) and sets a password; the staff
-- identity itself is created in the dedicated admin auth Supabase project.
-- Only the SHA-256 of the token is stored here.

-- CreateTable
CREATE TABLE "staff_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" UUID NOT NULL,
    "invitedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_invites_tokenHash_key" ON "staff_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "staff_invites_email_idx" ON "staff_invites"("email");
