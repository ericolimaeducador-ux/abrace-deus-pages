create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id text not null unique,
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  total_cents integer not null check (total_cents > 0),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  buyer_cpf text not null,
  shipping_address text not null,
  shipping_zip_code text not null,
  shipping_city text not null,
  shipping_state text not null,
  notes text,
  pix_key text not null,
  pix_payload text not null,
  payment_status text not null default 'aguardando_pagamento',
  shipping_status text not null default 'aguardando_separacao'
);

alter table public.orders enable row level security;

drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public"
on public.orders
for insert
to anon
with check (true);

drop policy if exists "orders_select_authenticated" on public.orders;
create policy "orders_select_authenticated"
on public.orders
for select
to authenticated
using (true);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
