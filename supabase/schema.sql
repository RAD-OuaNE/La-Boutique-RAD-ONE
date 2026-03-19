create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  title text not null,
  category text not null,
  description text default '',
  price numeric(10, 2) default 0,
  quantity integer not null default 0,
  show_price boolean not null default true,
  active boolean not null default true,
  image text not null,
  created_at timestamptz not null default now()
);

alter table public.products
add column if not exists quantity integer not null default 0;

create table if not exists public.orders (
  id text primary key,
  customer_name text not null,
  phone text not null,
  note text default '',
  status text not null default 'Nouvelle',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.surveys (
  id text primary key,
  title text not null,
  description text default '',
  active boolean not null default true,
  interested_count integer not null default 0,
  not_interested_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.surveys enable row level security;

grant select on public.surveys to anon, authenticated;
revoke update on public.surveys from anon;
grant update (interested_count, not_interested_count) on public.surveys to anon;
grant insert, update, delete on public.surveys to authenticated;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (active = true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products"
on public.products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can read orders" on public.orders;
create policy "Authenticated can read orders"
on public.orders
for select
to authenticated
using (true);

drop policy if exists "Authenticated can update orders" on public.orders;
create policy "Authenticated can update orders"
on public.orders
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read active surveys" on public.surveys;
create policy "Public can read active surveys"
on public.surveys
for select
to anon, authenticated
using (active = true);

drop policy if exists "Public can vote on surveys" on public.surveys;
create policy "Public can vote on surveys"
on public.surveys
for update
to anon, authenticated
using (active = true)
with check (true);

drop policy if exists "Authenticated can manage surveys" on public.surveys;
create policy "Authenticated can manage surveys"
on public.surveys
for all
to authenticated
using (true)
with check (true);

insert into public.products (id, title, category, description, price, quantity, show_price, active, image)
values
  ('prod-1', 'Coffret Elegance Nuit', 'parfums', 'Coffret parfum avec presentation premium pour cadeau.', 59.90, 5, true, true, 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80'),
  ('prod-2', 'Rouge Velours Signature', 'maquillage', 'Rouge a levres longue tenue pour usage quotidien.', 14.50, 8, true, true, 'https://images.unsplash.com/photo-1583241800698-9a4cb60d6f23?auto=format&fit=crop&w=1200&q=80'),
  ('prod-3', 'Camion Chantier Junior', 'jouets', 'Jouet enfant robuste et colore pour les periodes cadeaux.', 24.90, 3, true, true, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80')
on conflict (id) do nothing;
