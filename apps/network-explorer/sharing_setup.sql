-- Network Explorer: "Share to public" table for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run. Safe to run again.

create table if not exists public.public_networks (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  author      text check (char_length(author) <= 80),
  mode        text not null check (mode in ('explore', 'compare')),
  data        jsonb not null check (octet_length(data::text) < 1600000),
  hidden      boolean not null default false   -- set to true to take a network down
);

create index if not exists public_networks_created_at on public.public_networks (created_at desc);

-- Row-level security: visitors can read visible rows and add new ones, nothing else.
alter table public.public_networks enable row level security;

drop policy if exists "read visible networks" on public.public_networks;
create policy "read visible networks" on public.public_networks
  for select to anon, authenticated using (hidden = false);

drop policy if exists "share a network" on public.public_networks;
create policy "share a network" on public.public_networks
  for insert to anon, authenticated with check (hidden = false);

-- Column-level grants: visitors can't set id, created_at or hidden, and can never update or delete.
revoke all on public.public_networks from anon, authenticated;
grant select (id, created_at, name, description, author, mode, data) on public.public_networks to anon, authenticated;
grant insert (name, description, author, mode, data) on public.public_networks to anon, authenticated;

-- Simple spam brake: at most 20 new networks per hour across all visitors.
create or replace function public.public_networks_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.public_networks where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many networks shared in the last hour; try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists public_networks_rate_limit on public.public_networks;
create trigger public_networks_rate_limit before insert on public.public_networks
  for each row execute function public.public_networks_rate_limit();
