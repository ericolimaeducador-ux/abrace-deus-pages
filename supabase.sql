create extension if not exists pgcrypto;

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
create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_mercado_pago_payment_id_idx on public.orders (mercado_pago_payment_id);

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

drop policy if exists "payment_events_select_authenticated" on public.payment_events;
create policy "payment_events_select_authenticated"
on public.payment_events
for select
to authenticated
using (true);

create index if not exists payment_events_order_id_idx on public.payment_events (order_id);
create index if not exists payment_events_provider_payment_id_idx on public.payment_events (provider_payment_id);

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

drop policy if exists "shipping_rates_select_public" on public.shipping_rates;
create policy "shipping_rates_select_public"
on public.shipping_rates
for select
to anon, authenticated
using (is_active = true);

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

drop policy if exists "donations_insert_public" on public.donations;
create policy "donations_insert_public"
on public.donations
for insert
to anon
with check (true);

drop policy if exists "donations_select_authenticated" on public.donations;
create policy "donations_select_authenticated"
on public.donations
for select
to authenticated
using (true);

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

drop policy if exists "impact_metrics_select_public" on public.impact_metrics;
create policy "impact_metrics_select_public"
on public.impact_metrics
for select
to anon, authenticated
using (true);

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

drop policy if exists "partner_institutions_insert_public" on public.partner_institutions;
create policy "partner_institutions_insert_public"
on public.partner_institutions
for insert
to anon
with check (true);

drop policy if exists "partner_institutions_select_authenticated" on public.partner_institutions;
create policy "partner_institutions_select_authenticated"
on public.partner_institutions
for select
to authenticated
using (true);

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

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
on public.products
for select
to anon, authenticated
using (is_active = true);

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

drop policy if exists "testimonials_select_public" on public.testimonials;
create policy "testimonials_select_public"
on public.testimonials
for select
to anon, authenticated
using (is_active = true);
