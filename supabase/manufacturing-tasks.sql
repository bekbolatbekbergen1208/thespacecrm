create table if not exists public.bakery_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text not null default 'base',
  priority text not null default 'medium',
  status text not null default 'new',
  assignee text,
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.bakery_tasks add column if not exists department text not null default 'base';
alter table public.bakery_tasks add column if not exists priority text not null default 'medium';
alter table public.bakery_tasks add column if not exists status text not null default 'new';
alter table public.bakery_tasks add column if not exists assignee text;
alter table public.bakery_tasks add column if not exists due_date date;
alter table public.bakery_tasks add column if not exists notes text;

alter table public.bakery_tasks enable row level security;

drop policy if exists "Members can read bakery_tasks" on public.bakery_tasks;
drop policy if exists "Managers can insert bakery_tasks" on public.bakery_tasks;
drop policy if exists "Managers can update bakery_tasks" on public.bakery_tasks;
drop policy if exists "Managers can delete bakery_tasks" on public.bakery_tasks;

create policy "Members can read bakery_tasks"
on public.bakery_tasks
for select
using (public.is_company_member(company_id));

create policy "Managers can insert bakery_tasks"
on public.bakery_tasks
for insert
with check (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can update bakery_tasks"
on public.bakery_tasks
for update
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create policy "Managers can delete bakery_tasks"
on public.bakery_tasks
for delete
using (public.has_company_role(company_id, array['founder','admin','manager']::public.member_role[]));

create index if not exists bakery_tasks_company_department_status_idx
on public.bakery_tasks (company_id, department, status, created_at desc);

notify pgrst, 'reload schema';
