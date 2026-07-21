-- Keeps public.users in sync with Supabase's auth.users.
-- Run this once against the Supabase SQL editor (or as a Prisma migration
-- `migration.sql` in prisma/migrations/) after the first `prisma migrate deploy`,
-- since Prisma does not manage the `auth` schema itself.

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

-- Row-Level Security — defense-in-depth backstop alongside app-level role
-- checks (see packages/auth). Enable per-table as each is created.
alter table public.users enable row level security;
create policy "Users can read their own row"
  on public.users for select
  using (auth.uid() = id);

alter table public.orders enable row level security;
create policy "Users can read their own orders"
  on public.orders for select
  using (auth.uid() = "userId");

alter table public.self_publishing_projects enable row level security;
create policy "Authors can read their own projects"
  on public.self_publishing_projects for select
  using (auth.uid() = "authorId");

-- Admin app uses the Supabase service-role key (bypasses RLS) for staff
-- operations; the storefront app uses the anon key + user session, so RLS
-- applies to every direct-from-client query.
