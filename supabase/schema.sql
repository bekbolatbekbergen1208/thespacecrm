create extension if not exists pgcrypto;

create type public.member_role as enum ('founder', 'admin', 'manager', 'employee');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.access_request_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  pending_invite_code text,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null default 'Other',
  dashboard_route text not null default '/dashboard/other',
  country text not null default 'United States',
  phone text,
  plan text not null default 'Free',
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'employee',
  position text,
  dashboard_route text not null default '/dashboard/other',
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table public.employee_access_requests (
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

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text not null default 'lead',
  value numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.employees (
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

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.employees(id) on delete set null,
  status public.task_status not null default 'todo',
  due_date date,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
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

create policy "Users can read own profile" on public.profiles for select using (id = auth.uid());
create policy "Company members can read peer profiles" on public.profiles for select using (public.shares_company_with_user(id));
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can read companies" on public.companies for select using (public.is_company_member(id));
create policy "Authenticated users can find companies to join" on public.companies for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create company" on public.companies for insert with check (created_by = auth.uid());
create policy "Admins can update company" on public.companies for update using (public.has_company_role(id, array['founder','admin']::public.member_role[]));

create policy "Members can read memberships" on public.company_members for select using (public.is_company_member(company_id) or user_id = auth.uid());
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
create policy "Admins can update employees" on public.employees for update using (public.has_company_role(company_id, array['founder','admin']::public.member_role[]));
create policy "Admins can delete employees" on public.employees for delete using (public.has_company_role(company_id, array['founder','admin']::public.member_role[]));

create policy "Members can read tasks" on public.tasks for select using (public.is_company_member(company_id));
create policy "Managers can create tasks" on public.tasks for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can update tasks" on public.tasks for update using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can delete tasks" on public.tasks for delete using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Members can read inventory" on public.inventory_items for select using (public.is_company_member(company_id));
create policy "Managers can create inventory" on public.inventory_items for insert with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can update inventory" on public.inventory_items for update using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
create policy "Managers can delete inventory" on public.inventory_items for delete using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));
