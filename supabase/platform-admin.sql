create extension if not exists pgcrypto;

do $$
begin
  create type public.subscription_status as enum ('trial', 'active', 'past_due', 'blocked');
exception
  when duplicate_object then null;
end $$;

alter table public.companies add column if not exists subscription_status public.subscription_status not null default 'trial';
alter table public.companies add column if not exists subscription_due_date date not null default (current_date + interval '14 days');
alter table public.companies add column if not exists monthly_fee numeric(12,2) not null default 0;
alter table public.companies add column if not exists blocked_at timestamptz;
alter table public.companies add column if not exists last_paid_at timestamptz;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  paid_at date not null default current_date,
  period_start date,
  period_end date,
  method text not null default 'manual',
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$;

alter table public.platform_admins enable row level security;
alter table public.platform_subscription_payments enable row level security;

drop policy if exists "Platform admins can read admin list" on public.platform_admins;
drop policy if exists "Platform admins can read subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can insert subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can update subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can delete subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can read companies" on public.companies;
drop policy if exists "Platform admins can update companies" on public.companies;
drop policy if exists "Platform admins can read memberships" on public.company_members;
drop policy if exists "Platform admins can read profiles" on public.profiles;

create policy "Platform admins can read admin list"
on public.platform_admins for select
using (user_id = auth.uid() or public.is_platform_admin());

create policy "Platform admins can read subscription payments"
on public.platform_subscription_payments for select
using (public.is_platform_admin());

create policy "Platform admins can insert subscription payments"
on public.platform_subscription_payments for insert
with check (public.is_platform_admin());

create policy "Platform admins can update subscription payments"
on public.platform_subscription_payments for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admins can delete subscription payments"
on public.platform_subscription_payments for delete
using (public.is_platform_admin());

create policy "Platform admins can read companies"
on public.companies for select
using (public.is_platform_admin());

create policy "Platform admins can update companies"
on public.companies for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admins can read memberships"
on public.company_members for select
using (public.is_platform_admin());

create policy "Platform admins can read profiles"
on public.profiles for select
using (public.is_platform_admin());

create index if not exists companies_subscription_status_due_idx
on public.companies (subscription_status, subscription_due_date);

create index if not exists platform_subscription_payments_company_paid_idx
on public.platform_subscription_payments (company_id, paid_at desc);

insert into public.platform_admins (user_id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
where lower(email) = lower('BekbergenBekbolat0@gmail.com')
on conflict (user_id) do update
set email = excluded.email,
    full_name = excluded.full_name;

notify pgrst, 'reload schema';
