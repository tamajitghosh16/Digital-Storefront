-- ===========================================================================
-- Lock the storefront database down against direct Data API access
-- (docs/security-roadmap.md, finding C1).
--
-- Both apps read and write every business table through Prisma, which
-- connects as the `postgres` role and bypasses Row-Level Security. But
-- Supabase also exposes the `public` schema over its REST API (PostgREST) to
-- the `anon` and `authenticated` roles — reachable by anyone holding the
-- *public* publishable key that ships in the browser bundle. Before this
-- migration only users/orders/self_publishing_projects had RLS, so every
-- other table (addresses, payments, discount_codes, products, audit_logs,
-- staff_invites, ...) was readable AND writable from the internet.
--
-- This migration:
--   1. enables RLS on every table in `public` (no policy = deny all to
--      anon/authenticated; Prisma's `postgres` role is unaffected),
--   2. revokes all table/sequence/function privileges in `public` from
--      anon + authenticated, now and for future tables,
--   3. re-grants SELECT on only the three tables that carry an own-row
--      policy, and (re)creates those policies idempotently.
--
-- Every Supabase-specific statement is guarded, so this also applies
-- cleanly to a plain-Postgres shadow database during `prisma migrate dev`.
--
-- New tables added by later migrations start with RLS *off* but also with
-- no anon/authenticated privileges (step 2's default privileges), so they
-- are still unreachable. Run prisma/sql/auto_enable_rls.sql once per
-- project to also switch RLS on automatically for them.
-- ===========================================================================

-- 1. RLS on for every table in public.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END
$$;

-- 2 + 3. Privileges and own-row policies (Supabase roles only).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN

    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
    -- Supabase creates objects as `postgres` *and* `supabase_admin`; cover both.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      BEGIN
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipped default privileges for supabase_admin (not permitted for this role).';
      END;
    END IF;

    -- Own-row reads. Nothing in either app uses these today (everything goes
    -- through Prisma), but they're the documented starter policies from
    -- sync_user.sql and harmless: a signed-in user can read only their row.
    GRANT SELECT ON public.users, public.orders, public.self_publishing_projects TO authenticated;

    IF to_regproc('auth.uid') IS NOT NULL THEN
      DROP POLICY IF EXISTS "Users can read their own row" ON public.users;
      CREATE POLICY "Users can read their own row"
        ON public.users FOR SELECT TO authenticated
        USING ((SELECT auth.uid()) = id);

      DROP POLICY IF EXISTS "Users can read their own orders" ON public.orders;
      CREATE POLICY "Users can read their own orders"
        ON public.orders FOR SELECT TO authenticated
        USING ((SELECT auth.uid()) = "userId");

      DROP POLICY IF EXISTS "Authors can read their own projects" ON public.self_publishing_projects;
      CREATE POLICY "Authors can read their own projects"
        ON public.self_publishing_projects FOR SELECT TO authenticated
        USING ((SELECT auth.uid()) = "authorId");
    END IF;
  END IF;
END
$$;
