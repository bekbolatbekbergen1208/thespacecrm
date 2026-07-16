create table if not exists public.retail_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text,
  address text,
  photo_url text,
  photo_keywords text,
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  initial_quantity integer not null default 0,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.retail_products add column if not exists address text;

create table if not exists public.retail_product_sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.retail_products(id) on delete cascade,
  sale_date date not null default current_date,
  quantity integer not null default 1,
  payment_method text not null default 'cash',
  total_amount numeric(12,2) not null default 0,
  profit_amount numeric(12,2) not null default 0,
  customer_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.retail_debts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid references public.retail_products(id) on delete set null,
  customer_name text not null,
  phone text not null,
  amount numeric(12,2) not null default 0,
  due_date date not null default current_date,
  status text not null default 'open',
  notes text,
  last_reminded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.retail_debts add column if not exists product_id uuid references public.retail_products(id) on delete set null;

alter table public.retail_products enable row level security;
alter table public.retail_product_sales enable row level security;
alter table public.retail_debts enable row level security;

drop policy if exists "Members can read retail_products" on public.retail_products;
drop policy if exists "Managers can insert retail_products" on public.retail_products;
drop policy if exists "Managers can update retail_products" on public.retail_products;
drop policy if exists "Managers can delete retail_products" on public.retail_products;

create policy "Members can read retail_products"
on public.retail_products
for select
using (public.is_company_member(company_id));

create policy "Managers can insert retail_products"
on public.retail_products
for insert
with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can update retail_products"
on public.retail_products
for update
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can delete retail_products"
on public.retail_products
for delete
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

drop policy if exists "Members can read retail_product_sales" on public.retail_product_sales;
drop policy if exists "Members can insert retail_product_sales" on public.retail_product_sales;
drop policy if exists "Managers can insert retail_product_sales" on public.retail_product_sales;
drop policy if exists "Managers can update retail_product_sales" on public.retail_product_sales;
drop policy if exists "Managers can delete retail_product_sales" on public.retail_product_sales;

create policy "Members can read retail_product_sales"
on public.retail_product_sales
for select
using (public.is_company_member(company_id));

create policy "Members can insert retail_product_sales"
on public.retail_product_sales
for insert
with check (public.is_company_member(company_id));

create policy "Managers can update retail_product_sales"
on public.retail_product_sales
for update
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can delete retail_product_sales"
on public.retail_product_sales
for delete
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

drop policy if exists "Members can read retail_debts" on public.retail_debts;
drop policy if exists "Managers can insert retail_debts" on public.retail_debts;
drop policy if exists "Managers can update retail_debts" on public.retail_debts;
drop policy if exists "Managers can delete retail_debts" on public.retail_debts;

create policy "Members can read retail_debts"
on public.retail_debts
for select
using (public.is_company_member(company_id));

create policy "Managers can insert retail_debts"
on public.retail_debts
for insert
with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can update retail_debts"
on public.retail_debts
for update
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can delete retail_debts"
on public.retail_debts
for delete
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create index if not exists retail_products_company_status_created_idx
on public.retail_products (company_id, status, created_at desc);

create index if not exists retail_products_company_name_idx
on public.retail_products (company_id, name);

create index if not exists retail_product_sales_company_date_idx
on public.retail_product_sales (company_id, sale_date desc);

create index if not exists retail_product_sales_company_product_idx
on public.retail_product_sales (company_id, product_id);

create index if not exists retail_debts_company_status_created_idx
on public.retail_debts (company_id, status, created_at desc);

notify pgrst, 'reload schema';
