-- ===========================================================================
-- ADMIN AUTH PROJECT ONLY — run this in the SQL editor of the *dedicated*
-- Supabase project that backs apps/admin's authentication, NOT the storefront
-- project. (The storefront project uses sync_user.sql instead.)
--
-- apps/admin authenticates against its own Supabase project so that staff
-- identities can never be created by the storefront's public signup form.
-- That project has no Prisma-managed schema — this file creates the one
-- table apps/admin needs there: a `public.users` row per staff member,
-- carrying their role, kept in sync from that project's `auth.users` by a
-- trigger. packages/auth reads `role` from here over Supabase REST
-- (see getCurrentStaff() and createAuthMiddleware()).
--
-- apps/admin's DATABASE_URL still points at the shared storefront Postgres
-- for all business/CMS data — only auth lives here.
-- ===========================================================================

create table if not exists public.users (
  id          uuid primary key,
  email       text not null unique,
  name        text,
  -- Mirrors the Role enum in packages/database/prisma/schema.prisma. Plain
  -- text (no enum type) since Prisma doesn't manage this project. Everyone
  -- lands as READER; only an Owner promotes a row to SUPPORT/EDITOR/OWNER
  -- (done by hand today; a Staff & roles UI is planned — see apps/admin/CLAUDE.md).
  -- A READER row cannot reach the back office: createAuthMiddleware() requires
  -- ADMIN_ROLES.
  role        text not null default 'READER',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create or replace function public.handle_new_or_updated_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'READER',
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        "updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_or_updated_user();

-- Row-Level Security backstop: a signed-in staff member may read only their
-- own row (that's all getCurrentStaff() / the middleware role check need).
-- The service-role key bypasses this for the future Owner-run staff admin.
alter table public.users enable row level security;
drop policy if exists "Users can read their own row" on public.users;
create policy "Users can read their own row"
  on public.users for select
  using (auth.uid() = id);

-- After running this, create the Owner account (Authentication -> Add user)
-- and promote it:
--   update public.users set role = 'OWNER' where email = 'owner@example.com';
