-- ===========================================================================
-- OPTIONAL hardening — least-privilege database role for the running apps
-- (docs/security-roadmap.md, Phase 2.2). Run in the STOREFRONT project's SQL
-- editor, then point each app's runtime DATABASE_URL at this role and keep
-- the `postgres` role for DIRECT_URL (migrations) only.
--
-- The runtime role can read/write rows but cannot change the schema, touch
-- the `auth`/`storage` schemas, or disable RLS — so a SQL-injection bug or a
-- leaked DATABASE_URL can't drop tables or read Supabase Auth's internals.
--
-- 1. Replace CHANGE_ME with a long random password (e.g. `openssl rand -base64 36`).
-- 2. Pooled connection string for Prisma (Supavisor, transaction mode):
--      postgresql://app_runtime.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
-- ===========================================================================

create role app_runtime login password 'CHANGE_ME' noinherit;

grant usage on schema public to app_runtime;
grant select, insert, update, delete on all tables in schema public to app_runtime;
grant usage, select on all sequences in schema public to app_runtime;

-- Tables and sequences created by future migrations (run as postgres).
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to app_runtime;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to app_runtime;

-- Prisma talks to every table directly and RLS has no app-user policies
-- (authorization lives in the app), so this role must bypass RLS — exactly
-- like `postgres` does today, but without DDL or superuser-ish powers.
alter role app_runtime bypassrls;

-- Rollback:
--   reassign owned by app_runtime to postgres; drop owned by app_runtime; drop role app_runtime;
