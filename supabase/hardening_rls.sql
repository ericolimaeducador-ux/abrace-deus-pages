-- Abrace Deus - RLS hardening
-- Run this script in the Supabase SQL Editor after reviewing it.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'operator')),
  is_active boolean not null default true
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users admin
    where admin.user_id = auth.uid()
      and admin.is_active = true
      and admin.role in ('admin', 'operator')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin_users_no_public_insert" on public.admin_users;
drop policy if exists "admin_users_no_public_update" on public.admin_users;
drop policy if exists "admin_users_no_public_delete" on public.admin_users;

-- Orders: created and updated by the Edge Function with service role.
alter table public.orders enable row level security;
alter table public.orders force row level security;

alter table public.orders add column if not exists subtotal_cents integer;
alter table public.orders add column if not exists shipping_cents integer not null default 0;
alter table public.orders add column if not exists buyer_cpf_cnpj text;
alter table public.orders add column if not exists mercado_pago_payment_id text;
alter table public.orders add column if not exists mercado_pago_preference_id text;
alter table public.orders add column if not exists mercado_pago_status text;
alter table public.orders add column if not exists mercado_pago_status_detail text;
alter table public.orders add column if not exists message_signature text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_quantity_safe'
  ) then
    alter table public.orders add constraint orders_quantity_safe check (quantity between 1 and 20) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_buyer_cpf_digits'
  ) then
    alter table public.orders add constraint orders_buyer_cpf_digits check (buyer_cpf ~ '^[0-9]{11}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_shipping_zip_digits'
  ) then
    alter table public.orders add constraint orders_shipping_zip_digits check (shipping_zip_code ~ '^[0-9]{8}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_disclaimer_required'
  ) then
    alter table public.orders add constraint orders_disclaimer_required check (disclaimer_accepted = true) not valid;
  end if;
end $$;

drop policy if exists "orders_insert_public" on public.orders;
drop policy if exists "orders_select_authenticated" on public.orders;
drop policy if exists "orders_select_admin" on public.orders;
drop policy if exists "orders_update_admin" on public.orders;

create policy "orders_select_admin"
on public.orders
for select
to authenticated
using (public.is_admin());

create policy "orders_update_admin"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Donations: public can submit, only admins can read/manage.
alter table public.donations enable row level security;
alter table public.donations force row level security;

drop policy if exists "donations_insert_public" on public.donations;
drop policy if exists "donations_select_authenticated" on public.donations;
drop policy if exists "donations_select_admin" on public.donations;
drop policy if exists "donations_update_admin" on public.donations;

create policy "donations_insert_public"
on public.donations
for insert
to anon
with check (
  donor_name is not null
  and length(trim(donor_name)) between 2 and 160
  and donor_email is not null
  and donor_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  and quantity between 1 and 100
);

create policy "donations_select_admin"
on public.donations
for select
to authenticated
using (public.is_admin());

create policy "donations_update_admin"
on public.donations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Partner institutions: public can apply, only admins can read/manage.
alter table public.partner_institutions enable row level security;
alter table public.partner_institutions force row level security;

drop policy if exists "partner_institutions_insert_public" on public.partner_institutions;
drop policy if exists "partner_institutions_select_authenticated" on public.partner_institutions;
drop policy if exists "partner_institutions_select_admin" on public.partner_institutions;
drop policy if exists "partner_institutions_update_admin" on public.partner_institutions;

create policy "partner_institutions_insert_public"
on public.partner_institutions
for insert
to anon
with check (
  institution_name is not null
  and length(trim(institution_name)) between 2 and 180
  and responsible_name is not null
  and length(trim(responsible_name)) between 2 and 160
  and phone is not null
  and length(trim(phone)) between 8 and 30
  and email is not null
  and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
);

create policy "partner_institutions_select_admin"
on public.partner_institutions
for select
to authenticated
using (public.is_admin());

create policy "partner_institutions_update_admin"
on public.partner_institutions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Payment events: service role writes, admins read.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id text not null,
  provider text not null default 'mercado_pago',
  provider_payment_id text,
  event_type text not null,
  status text,
  payload jsonb not null default '{}'::jsonb
);

alter table public.payment_events enable row level security;
alter table public.payment_events force row level security;

drop policy if exists "payment_events_select_authenticated" on public.payment_events;
drop policy if exists "payment_events_select_admin" on public.payment_events;

create policy "payment_events_select_admin"
on public.payment_events
for select
to authenticated
using (public.is_admin());

-- Public catalog/content.
alter table public.products enable row level security;
alter table public.products force row level security;

drop policy if exists "products_select_public" on public.products;
drop policy if exists "products_manage_admin" on public.products;

create policy "products_select_public"
on public.products
for select
to anon, authenticated
using (is_active = true);

create policy "products_manage_admin"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.testimonials enable row level security;
alter table public.testimonials force row level security;

drop policy if exists "testimonials_select_public" on public.testimonials;
drop policy if exists "testimonials_manage_admin" on public.testimonials;

create policy "testimonials_select_public"
on public.testimonials
for select
to anon, authenticated
using (is_active = true);

create policy "testimonials_manage_admin"
on public.testimonials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.impact_metrics enable row level security;
alter table public.impact_metrics force row level security;

drop policy if exists "impact_metrics_select_public" on public.impact_metrics;
drop policy if exists "impact_metrics_manage_admin" on public.impact_metrics;

create policy "impact_metrics_select_public"
on public.impact_metrics
for select
to anon, authenticated
using (true);

create policy "impact_metrics_manage_admin"
on public.impact_metrics
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Explicit privilege baseline for PostgREST roles.
revoke update, delete on public.orders from anon;
revoke update, delete on public.donations from anon;
revoke update, delete on public.partner_institutions from anon;
revoke all on public.payment_events from anon;
revoke all on public.admin_users from anon;

grant select on public.products to anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant select on public.impact_metrics to anon, authenticated;
grant insert on public.donations to anon;
grant insert on public.partner_institutions to anon;
grant select, update on public.orders to authenticated;
grant select, update on public.donations to authenticated;
grant select, update on public.partner_institutions to authenticated;
grant select on public.payment_events to authenticated;
grant select on public.admin_users to authenticated;

create index if not exists admin_users_user_id_idx on public.admin_users (user_id);
create index if not exists admin_users_email_idx on public.admin_users (email);
create index if not exists orders_mercado_pago_payment_id_idx on public.orders (mercado_pago_payment_id);
create index if not exists payment_events_order_id_idx on public.payment_events (order_id);
create index if not exists payment_events_provider_payment_id_idx on public.payment_events (provider_payment_id);
