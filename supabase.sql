-- Abrace Deus - schema completo e seguro (idempotente).
-- Este script já inclui o hardening de RLS: pode ser executado quantas vezes
-- for necessário sem reintroduzir políticas permissivas.
-- Leitura de pedidos/doações/instituições é restrita a administradores
-- (tabela admin_users). Pedidos são criados pela Edge Function com service role.

create extension if not exists pgcrypto;

-- =====================================================================
-- Administradores e função de verificação
-- =====================================================================
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'operator')),
  is_active boolean not null default true
);

alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;

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
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create index if not exists admin_users_user_id_idx on public.admin_users (user_id);
create index if not exists admin_users_email_idx on public.admin_users (email);

-- =====================================================================
-- Pedidos
-- =====================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id text not null unique,
  order_number text,
  product_id text not null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  subtotal_cents integer,
  shipping_cents integer not null default 0,
  total_cents integer not null check (total_cents > 0),
  total_amount numeric(10, 2),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  buyer_cpf text not null,
  buyer_cpf_cnpj text,
  recipient_name text,
  recipient_phone text,
  recipient_email text,
  shipping_address text not null,
  shipping_zip_code text not null,
  shipping_city text not null,
  shipping_state text not null,
  recipient_zipcode text,
  recipient_address text,
  recipient_number text,
  recipient_complement text,
  recipient_district text,
  recipient_city text,
  recipient_state text,
  reason text,
  personal_message text,
  message_signature text,
  is_anonymous boolean not null default false,
  wants_delivery_confirmation boolean not null default false,
  payment_method text not null default 'mercado_pago',
  payment_status text not null default 'pending',
  mercado_pago_payment_id text,
  mercado_pago_preference_id text,
  mercado_pago_status text,
  mercado_pago_status_detail text,
  order_status text not null default 'created',
  shipping_status text not null default 'aguardando_separacao',
  disclaimer_accepted boolean not null default false,
  notes text,
  pix_key text,
  pix_payload text
);

alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists subtotal_cents integer;
alter table public.orders add column if not exists shipping_cents integer not null default 0;
alter table public.orders add column if not exists total_amount numeric(10, 2);
alter table public.orders add column if not exists buyer_cpf_cnpj text;
alter table public.orders add column if not exists recipient_name text;
alter table public.orders add column if not exists recipient_phone text;
alter table public.orders add column if not exists recipient_email text;
alter table public.orders add column if not exists recipient_zipcode text;
alter table public.orders add column if not exists recipient_address text;
alter table public.orders add column if not exists recipient_number text;
alter table public.orders add column if not exists recipient_complement text;
alter table public.orders add column if not exists recipient_district text;
alter table public.orders add column if not exists recipient_city text;
alter table public.orders add column if not exists recipient_state text;
alter table public.orders add column if not exists reason text;
alter table public.orders add column if not exists personal_message text;
alter table public.orders add column if not exists message_signature text;
alter table public.orders add column if not exists is_anonymous boolean not null default false;
alter table public.orders add column if not exists wants_delivery_confirmation boolean not null default false;
alter table public.orders add column if not exists payment_method text not null default 'mercado_pago';
alter table public.orders add column if not exists mercado_pago_payment_id text;
alter table public.orders add column if not exists mercado_pago_preference_id text;
alter table public.orders add column if not exists mercado_pago_status text;
alter table public.orders add column if not exists mercado_pago_status_detail text;
alter table public.orders add column if not exists order_status text not null default 'created';
alter table public.orders add column if not exists disclaimer_accepted boolean not null default false;
alter table public.orders alter column pix_key drop not null;
alter table public.orders alter column pix_payload drop not null;

-- Constraints defensivas (validadas).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_quantity_safe') then
    alter table public.orders add constraint orders_quantity_safe check (quantity between 1 and 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_buyer_cpf_digits') then
    alter table public.orders add constraint orders_buyer_cpf_digits check (buyer_cpf ~ '^[0-9]{11}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_shipping_zip_digits') then
    alter table public.orders add constraint orders_shipping_zip_digits check (shipping_zip_code ~ '^[0-9]{8}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_disclaimer_required') then
    alter table public.orders add constraint orders_disclaimer_required check (disclaimer_accepted = true);
  end if;
end $$;

alter table public.orders enable row level security;
alter table public.orders force row level security;

-- Pedidos são inseridos pela Edge Function (service role, ignora RLS).
-- anon NÃO recebe insert. Somente admin lê/atualiza.
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

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_mercado_pago_payment_id_idx on public.orders (mercado_pago_payment_id);

-- =====================================================================
-- Eventos de pagamento (escrita por service role, leitura admin)
-- =====================================================================
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

create index if not exists payment_events_order_id_idx on public.payment_events (order_id);
create index if not exists payment_events_provider_payment_id_idx on public.payment_events (provider_payment_id);

-- =====================================================================
-- Tabela de frete
-- =====================================================================
create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  state text not null unique check (state ~ '^[A-Z]{2}$'),
  price_cents integer not null check (price_cents >= 0),
  delivery_days_min integer not null default 3 check (delivery_days_min > 0),
  delivery_days_max integer not null default 10 check (delivery_days_max >= delivery_days_min),
  is_active boolean not null default true
);

alter table public.shipping_rates enable row level security;
alter table public.shipping_rates force row level security;

drop policy if exists "shipping_rates_select_public" on public.shipping_rates;
drop policy if exists "shipping_rates_manage_admin" on public.shipping_rates;
create policy "shipping_rates_select_public"
on public.shipping_rates
for select
to anon, authenticated
using (is_active = true);
create policy "shipping_rates_manage_admin"
on public.shipping_rates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.shipping_rates (state, price_cents, delivery_days_min, delivery_days_max)
values
  ('SP', 1890, 2, 5),
  ('RJ', 2490, 3, 7),
  ('MG', 2490, 3, 7),
  ('ES', 2690, 4, 8),
  ('PR', 2690, 4, 8),
  ('SC', 2990, 5, 9),
  ('RS', 3290, 5, 10),
  ('DF', 3290, 5, 10),
  ('GO', 3490, 5, 10),
  ('MS', 3490, 5, 10),
  ('MT', 3990, 6, 12),
  ('BA', 3990, 6, 12),
  ('SE', 4290, 6, 12),
  ('AL', 4290, 6, 12),
  ('PE', 4490, 6, 12),
  ('PB', 4490, 6, 12),
  ('RN', 4690, 7, 13),
  ('CE', 4690, 7, 13),
  ('PI', 4990, 7, 14),
  ('MA', 4990, 7, 14),
  ('TO', 4990, 7, 14),
  ('PA', 5490, 8, 16),
  ('AP', 5990, 9, 18),
  ('AM', 5990, 9, 18),
  ('RR', 6490, 10, 20),
  ('RO', 6490, 10, 20),
  ('AC', 6990, 10, 20)
on conflict (state) do update
set
  price_cents = excluded.price_cents,
  delivery_days_min = excluded.delivery_days_min,
  delivery_days_max = excluded.delivery_days_max,
  is_active = true;

-- =====================================================================
-- Doações (inserção pública validada, leitura admin)
-- =====================================================================
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  quantity integer not null default 1 check (quantity > 0),
  amount numeric(10, 2),
  is_anonymous boolean not null default false,
  wants_impact_report boolean not null default false,
  message text,
  payment_status text not null default 'pending',
  donation_status text not null default 'pending'
);

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

-- =====================================================================
-- Métricas de impacto (leitura pública)
-- =====================================================================
create table if not exists public.impact_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kits_sold integer not null default 0,
  kits_donated integer not null default 0,
  institutions_count integer not null default 0,
  cities_reached integer not null default 0,
  people_reached integer not null default 0
);

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

-- =====================================================================
-- Instituições parceiras (inscrição pública validada, leitura admin)
-- =====================================================================
create table if not exists public.partner_institutions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  institution_name text not null,
  cnpj text,
  responsible_name text not null,
  responsible_role text,
  phone text not null,
  email text not null,
  city text,
  state text,
  institution_type text,
  people_served_per_month integer,
  beneficiary_indication_process text,
  notes text,
  status text not null default 'pending',
  terms_accepted boolean not null default false
);

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

-- =====================================================================
-- Catálogo público (produtos e depoimentos)
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  category text,
  short_description text,
  long_description text,
  price numeric(10, 2) not null,
  image_url text,
  is_active boolean not null default true,
  is_donation boolean not null default false,
  includes text[],
  cta_text text
);

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

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  location text,
  experience_type text,
  content text not null,
  is_active boolean not null default true
);

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

-- =====================================================================
-- Privilégios explícitos por role (PostgREST)
-- =====================================================================
revoke insert, select, update, delete on public.orders from anon;
revoke all on public.payment_events from anon;
revoke update, delete on public.donations from anon;
revoke update, delete on public.partner_institutions from anon;
revoke all on public.admin_users from anon;

grant select on public.products to anon, authenticated;
grant select on public.testimonials to anon, authenticated;
grant select on public.impact_metrics to anon, authenticated;
grant select on public.shipping_rates to anon, authenticated;
grant insert on public.donations to anon;
grant insert on public.partner_institutions to anon;
grant select, update on public.orders to authenticated;
grant select, update on public.donations to authenticated;
grant select, update on public.partner_institutions to authenticated;
grant select on public.payment_events to authenticated;
grant select on public.admin_users to authenticated;
grant all on public.shipping_rates to authenticated;
