-- ===========================================================================
-- Run ONCE in the SQL editor of the STOREFRONT Supabase project (and of any
-- other project that holds Prisma tables). Not a Prisma migration because
-- event triggers need elevated privileges that `prisma migrate` may lack.
--
-- Every table created in `public` from now on gets Row-Level Security
-- switched on automatically, so a future migration can't reopen the Data
-- API hole closed by 20260927100100_lock_down_data_api (see
-- docs/security-roadmap.md, C1). RLS with no policy = no access for
-- anon/authenticated; Prisma (the `postgres` role) is unaffected.
-- ===========================================================================

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end;
$$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- Verify: every row should say true.
--   select relname, relrowsecurity from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind in ('r','p') order by 2, 1;
