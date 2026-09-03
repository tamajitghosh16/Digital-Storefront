-- Staff now authenticate against a dedicated Supabase project (see
-- packages/auth). Their auth UIDs have no row in this database's `users`
-- table, so the AuditLog -> User foreign key can no longer hold.

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "actorEmail" TEXT;
