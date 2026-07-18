-- Clean rerunnable base schema for CRM.Space.
create extension if not exists pgcrypto;

do $$
begin
  create type public.member_role as enum ('founder', 'admin', 'manager', 'employee');
exception
  when duplicate_object then null;
end $$;
do $$
begin
  create type public.task_status as enum ('todo', 'in_progress', 'done');
exception
  when duplicate_object then null;
end $$;
do $$
begin
  create type public.access_request_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;
do $$
begin
  create type public.subscription_status as enum ('trial', 'active', 'past_due', 'blocked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  pending_invite_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null default 'Other',
  dashboard_route text not null default '/dashboard/other',
  country text not null default 'United States',
  phone text,
  plan text not null default 'Free',
  subscription_status public.subscription_status not null default 'trial',
  subscription_due_date date not null default (current_date + interval '14 days'),
  monthly_fee numeric(12,2) not null default 0,
  blocked_at timestamptz,
  last_paid_at timestamptz,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

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

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'employee',
  position text,
  dashboard_route text not null default '/dashboard/other',
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.employee_access_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  position text not null,
  company_name text not null,
  invite_code text,
  status public.access_request_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text not null default 'lead',
  value numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  phone text,
  position text not null default 'Employee',
  salary numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.employees(id) on delete set null,
  status public.task_status not null default 'todo',
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  sku text,
  quantity integer not null default 0,
  price numeric(12,2) not null default 0,
  reorder_level integer not null default 5,
  created_at timestamptz not null default now()
);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and user_id = auth.uid()
  );
$$;

create or replace function public.shares_company_with_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members mine
    join public.company_members theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, pending_invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'invite_code', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.employee_access_requests enable row level security;
alter table public.customers enable row level security;
alter table public.employees enable row level security;
alter table public.tasks enable row level security;
alter table public.inventory_items enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_subscription_payments enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Company members can read peer profiles" on public.profiles;
drop policy if exists "Platform admins can read profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Members can read companies" on public.companies;
drop policy if exists "Platform admins can read companies" on public.companies;
drop policy if exists "Authenticated users can find companies to join" on public.companies;
drop policy if exists "Authenticated users can create company" on public.companies;
drop policy if exists "Admins can update company" on public.companies;
drop policy if exists "Platform admins can update companies" on public.companies;

drop policy if exists "Members can read memberships" on public.company_members;
drop policy if exists "Platform admins can read memberships" on public.company_members;
drop policy if exists "Users can join companies" on public.company_members;
drop policy if exists "Managers can approve memberships" on public.company_members;
drop policy if exists "Admins can update memberships" on public.company_members;
drop policy if exists "Admins can delete memberships" on public.company_members;

drop policy if exists "Users can create own access requests" on public.employee_access_requests;
drop policy if exists "Users can read own access requests" on public.employee_access_requests;
drop policy if exists "Managers can read access requests" on public.employee_access_requests;
drop policy if exists "Managers can update access requests" on public.employee_access_requests;

drop policy if exists "Members can read customers" on public.customers;
drop policy if exists "Managers can create customers" on public.customers;
drop policy if exists "Managers can update customers" on public.customers;
drop policy if exists "Managers can delete customers" on public.customers;

drop policy if exists "Members can read employees" on public.employees;
drop policy if exists "Admins can create employees" on public.employees;
drop policy if exists "Managers can create approved employees" on public.employees;
drop policy if exists "Members can create own employee record" on public.employees;
drop policy if exists "Managers can update employees" on public.employees;
drop policy if exists "Managers can delete employees" on public.employees;

drop policy if exists "Members can read tasks" on public.tasks;
drop policy if exists "Managers can create tasks" on public.tasks;
drop policy if exists "Managers can update tasks" on public.tasks;
drop policy if exists "Managers can delete tasks" on public.tasks;

drop policy if exists "Members can read inventory" on public.inventory_items;
drop policy if exists "Managers can create inventory" on public.inventory_items;
drop policy if exists "Managers can update inventory" on public.inventory_items;
drop policy if exists "Managers can delete inventory" on public.inventory_items;

drop policy if exists "Platform admins can read admin list" on public.platform_admins;

drop policy if exists "Platform admins can read subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can insert subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can update subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can delete subscription payments" on public.platform_subscription_payments;

create policy "Users can read own profile" on public.profiles for select using (id = auth.uid());
create policy "Company members can read peer profiles" on public.profiles for select using (public.shares_company_with_user(id));
create policy "Platform admins can read profiles" on public.profiles for select using (public.is_platform_admin());
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can read companies" on public.companies for select using (public.is_company_member(id));
create policy "Platform admins can read companies" on public.companies for select using (public.is_platform_admin());
create policy "Authenticated users can find companies to join" on public.companies for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create company" on public.companies for insert with check (created_by = auth.uid());
create policy "Admins can update company" on public.companies for update using (public.has_company_role(id, array['founder','admin']::public.member_role[]));
create policy "Platform admins can update companies" on public.companies for update using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "Members can read memberships" on public.company_members for select using (public.is_company_member(company_id) or user_id = auth.uid());
create policy "Platform admins can read memberships" on public.company_members for select using (public.is_platform_admin());
create policy "Users can join companies" on public.company_members for insert with check (user_id = auth.uid());
create policy "Managers can approve memberships" on public.company_members for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Admins can update memberships" on public.company_members for update using (public.has_company_role(company_id, array['founder','admin']::public.member_role[]));
create policy "Admins can delete memberships" on public.company_members for delete using (public.has_company_role(company_id, array['founder','admin']::public.member_role[]));

create policy "Users can create own access requests" on public.employee_access_requests for insert with check (user_id = auth.uid());
create policy "Users can read own access requests" on public.employee_access_requests for select using (user_id = auth.uid());
create policy "Managers can read access requests" on public.employee_access_requests for select using (
  (company_id is not null and public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]))
  or exists (
    select 1
    from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = auth.uid()
      and cm.role = any(array['founder','admin','manager']::public.member_role[])
      and lower(c.name) = lower(employee_access_requests.company_name)
  )
);
create policy "Managers can update access requests" on public.employee_access_requests for update using (
  (company_id is not null and public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]))
  or exists (
    select 1
    from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = auth.uid()
      and cm.role = any(array['founder','admin','manager']::public.member_role[])
      and lower(c.name) = lower(employee_access_requests.company_name)
  )
);

create policy "Members can read customers" on public.customers for select using (public.is_company_member(company_id));
create policy "Managers can create customers" on public.customers for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can update customers" on public.customers for update using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can delete customers" on public.customers for delete using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Members can read employees" on public.employees for select using (public.is_company_member(company_id));
create policy "Admins can create employees" on public.employees for insert with check (public.has_company_role(company_id, array['founder','admin']::public.member_role[]));
create policy "Managers can create approved employees" on public.employees for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Members can create own employee record" on public.employees for insert with check (public.is_company_member(company_id) and user_id = auth.uid());
create policy "Managers can update employees" on public.employees for update using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can delete employees" on public.employees for delete using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Members can read tasks" on public.tasks for select using (public.is_company_member(company_id));
create policy "Managers can create tasks" on public.tasks for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can update tasks" on public.tasks for update using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can delete tasks" on public.tasks for delete using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Members can read inventory" on public.inventory_items for select using (public.is_company_member(company_id));
create policy "Managers can create inventory" on public.inventory_items for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can update inventory" on public.inventory_items for update using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can delete inventory" on public.inventory_items for delete using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Platform admins can read admin list" on public.platform_admins for select using (user_id = auth.uid() or public.is_platform_admin());

create policy "Platform admins can read subscription payments" on public.platform_subscription_payments for select using (public.is_platform_admin());
create policy "Platform admins can insert subscription payments" on public.platform_subscription_payments for insert with check (public.is_platform_admin());
create policy "Platform admins can update subscription payments" on public.platform_subscription_payments for update using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "Platform admins can delete subscription payments" on public.platform_subscription_payments for delete using (public.is_platform_admin());

create index if not exists companies_subscription_status_due_idx
on public.companies (subscription_status, subscription_due_date);

create index if not exists platform_subscription_payments_company_paid_idx
on public.platform_subscription_payments (company_id, paid_at desc);

-- После создания вашего аккаунта вставьте себя как владельца платформы:
insert into public.platform_admins (user_id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
where lower(email) = lower('BekbergenBekbolat0@gmail.com')
on conflict (user_id) do nothing;
