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

alter table public.retail_products enable row level security;
alter table public.retail_product_sales enable row level security;

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

notify pgrst, 'reload schema';
