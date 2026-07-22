create table if not exists public.robotics_students (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  photo_url text,
  first_name text not null,
  last_name text not null,
  birth_date date,
  parent_name text not null,
  parent_phone text not null,
  whatsapp text,
  email text,
  school text,
  grade text,
  group_name text,
  mentor_name text,
  start_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.robotics_students add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.robotics_students add column if not exists photo_url text;
alter table public.robotics_students add column if not exists first_name text;
alter table public.robotics_students add column if not exists last_name text;
alter table public.robotics_students add column if not exists birth_date date;
alter table public.robotics_students add column if not exists parent_name text;
alter table public.robotics_students add column if not exists parent_phone text;
alter table public.robotics_students add column if not exists whatsapp text;
alter table public.robotics_students add column if not exists email text;
alter table public.robotics_students add column if not exists school text;
alter table public.robotics_students add column if not exists grade text;
alter table public.robotics_students add column if not exists group_name text;
alter table public.robotics_students add column if not exists mentor_name text;
alter table public.robotics_students add column if not exists start_date date;
alter table public.robotics_students add column if not exists status text default 'active';
alter table public.robotics_students add column if not exists notes text;
alter table public.robotics_students add column if not exists created_at timestamptz default now();
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'robotics_students' and column_name = 'full_name'
  ) then
    alter table public.robotics_students alter column full_name drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'robotics_students' and column_name = 'full_name'
  ) then
    update public.robotics_students
    set
      first_name = coalesce(first_name, split_part(full_name, ' ', 1), 'Student'),
      last_name = coalesce(nullif(last_name, ''), nullif(trim(regexp_replace(coalesce(full_name, ''), '^\S+\s*', '')), ''), '-')
    where first_name is null or last_name is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'robotics_students' and column_name = 'phone'
  ) then
    update public.robotics_students
    set parent_phone = coalesce(parent_phone, phone, '-')
    where parent_phone is null;
  end if;

  update public.robotics_students
  set
    first_name = coalesce(first_name, 'Student'),
    last_name = coalesce(last_name, '-'),
    parent_name = coalesce(parent_name, '-'),
    parent_phone = coalesce(parent_phone, '-'),
    status = coalesce(status, 'active')
  where first_name is null
     or last_name is null
     or parent_phone is null
     or parent_name is null
     or status is null;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['robotics_lessons','robotics_attendance','robotics_grades']
  loop
    execute format('drop policy if exists "Members can insert mentor records %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Members can update mentor records %1$s" on public.%1$I', tbl);
    execute format('create policy "Members can insert mentor records %1$s" on public.%1$I for insert with check (public.is_company_member(company_id))', tbl);
    execute format('create policy "Members can update mentor records %1$s" on public.%1$I for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', tbl);
  end loop;
end $$;

create table if not exists public.bakery_shops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  phone text,
  driver_name text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.bakery_shops add column if not exists latitude numeric(10,7);
alter table public.bakery_shops add column if not exists longitude numeric(10,7);

create table if not exists public.bakery_stock (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_date date not null default current_date,
  keks_qty integer not null default 0,
  korzhik_qty integer not null default 0,
  plyannik_qty integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shop_id uuid not null references public.bakery_shops(id) on delete cascade,
  sale_date date not null default current_date,
  keks_qty integer not null default 0,
  korzhik_qty integer not null default 0,
  plyannik_qty integer not null default 0,
  keks_return integer not null default 0,
  korzhik_return integer not null default 0,
  plyannik_return integer not null default 0,
  cash_amount numeric(12,2) not null default 0,
  kaspi_amount numeric(12,2) not null default 0,
  debt_amount numeric(12,2) not null default 0,
  expected_amount numeric(12,2) not null default 0,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  product_type text not null,
  last_supply_date date not null default current_date,
  amount numeric(12,2) not null default 0,
  debt_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text,
  photo_url text,
  photo_keywords text,
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  initial_quantity integer not null default 0,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_product_sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.bakery_products(id) on delete cascade,
  sale_date date not null default current_date,
  quantity integer not null default 1,
  payment_method text not null default 'cash',
  total_amount numeric(12,2) not null default 0,
  profit_amount numeric(12,2) not null default 0,
  customer_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  plate_number text,
  driver_name text,
  phone text,
  capacity text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  address text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  loyalty_info text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.bakery_delivery_routes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  route_date date not null default current_date,
  route_name text not null,
  vehicle_id uuid references public.bakery_vehicles(id) on delete set null,
  driver_name text,
  shop_ids text not null default '',
  client_ids text not null default '',
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.bakery_delivery_routes add column if not exists client_ids text not null default '';

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

create index if not exists bakery_tasks_company_department_status_idx
on public.bakery_tasks (company_id, department, status, created_at desc);

do $$
declare
  tbl text;
begin
  foreach tbl in array array['bakery_shops','bakery_stock','bakery_sales','bakery_suppliers','bakery_expenses','bakery_products','bakery_product_sales','bakery_vehicles','bakery_clients','bakery_delivery_routes','bakery_tasks']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "Members can read %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can insert %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can update %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can delete %1$s" on public.%1$I', tbl);
    execute format('create policy "Members can read %1$s" on public.%1$I for select using (public.is_company_member(company_id))', tbl);
    execute format('create policy "Managers can insert %1$s" on public.%1$I for insert with check (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
    execute format('create policy "Managers can update %1$s" on public.%1$I for update using (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
    execute format('create policy "Managers can delete %1$s" on public.%1$I for delete using (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
  end loop;
end $$;

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

do $$
declare
  tbl text;
begin
  foreach tbl in array array['retail_products','retail_product_sales','retail_debts']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "Members can read %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can insert %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can update %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can delete %1$s" on public.%1$I', tbl);
    execute format('create policy "Members can read %1$s" on public.%1$I for select using (public.is_company_member(company_id))', tbl);
    execute format('create policy "Managers can insert %1$s" on public.%1$I for insert with check (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
    execute format('create policy "Managers can update %1$s" on public.%1$I for update using (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
    execute format('create policy "Managers can delete %1$s" on public.%1$I for delete using (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
  end loop;
end $$;

drop policy if exists "Members can insert bakery_sales" on public.bakery_sales;
create policy "Members can insert bakery_sales"
on public.bakery_sales
for insert
with check (public.is_company_member(company_id));

drop policy if exists "Members can insert bakery_product_sales" on public.bakery_product_sales;
create policy "Members can insert bakery_product_sales"
on public.bakery_product_sales
for insert
with check (public.is_company_member(company_id));

create table if not exists public.robotics_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  student_name text not null,
  group_name text,
  amount numeric(12,2) not null default 0,
  paid_at date not null default current_date,
  method text not null default 'Kaspi',
  status text not null default 'оплачено',
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lesson_id uuid,
  student_name text not null,
  lesson_date date not null default current_date,
  status text not null default 'присутствовал',
  group_name text,
  mentor_name text,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_lessons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lesson_date date not null default current_date,
  lesson_time time not null default '10:00',
  lesson_end_time time,
  event_type text not null default 'group',
  group_name text,
  student_name text,
  room text not null,
  mentor_name text not null,
  topic text not null,
  status text not null default 'scheduled',
  source_group_id uuid,
  series_id text,
  recurrence_rule text,
  notes text,
  moved_from_date date,
  moved_from_time time,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_trial_lessons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  child_name text not null,
  parent_name text not null,
  phone text not null,
  source text not null,
  trial_date date not null default current_date,
  trial_time time not null default '10:00',
  mentor_name text,
  status text not null default 'записан',
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  student_name text not null,
  group_name text,
  subscription_type text not null,
  total_lessons integer not null default 8,
  remaining_lessons integer not null default 8,
  start_date date not null default current_date,
  end_date date not null default current_date + interval '30 days',
  price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  age_range text not null,
  course text not null,
  level text,
  mentor_name text not null,
  schedule text not null default '',
  schedule_days text,
  start_time time,
  end_time time,
  schedule_start_date date,
  schedule_end_date date,
  skip_holidays text not null default 'no',
  room text not null,
  max_students integer not null default 12,
  status text not null default 'active',
  notes text,
  rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.robotics_payments add column if not exists group_name text;
alter table public.robotics_attendance add column if not exists lesson_id uuid;
alter table public.robotics_lessons add column if not exists lesson_end_time time;
alter table public.robotics_lessons add column if not exists event_type text not null default 'group';
alter table public.robotics_lessons add column if not exists student_name text;
alter table public.robotics_lessons alter column group_name drop not null;
alter table public.robotics_lessons add column if not exists status text not null default 'scheduled';
alter table public.robotics_lessons add column if not exists source_group_id uuid;
alter table public.robotics_lessons add column if not exists series_id text;
alter table public.robotics_lessons add column if not exists recurrence_rule text;
alter table public.robotics_lessons add column if not exists notes text;
alter table public.robotics_lessons add column if not exists moved_from_date date;
alter table public.robotics_lessons add column if not exists moved_from_time time;
alter table public.robotics_lessons add column if not exists cancelled_at timestamptz;
alter table public.robotics_subscriptions add column if not exists group_name text;
alter table public.robotics_groups alter column schedule set default '';
alter table public.robotics_groups alter column schedule drop not null;
alter table public.robotics_groups add column if not exists level text;
alter table public.robotics_groups add column if not exists schedule_days text;
alter table public.robotics_groups add column if not exists start_time time;
alter table public.robotics_groups add column if not exists end_time time;
alter table public.robotics_groups add column if not exists schedule_start_date date;
alter table public.robotics_groups add column if not exists schedule_end_date date;
alter table public.robotics_groups add column if not exists skip_holidays text not null default 'no';
alter table public.robotics_groups add column if not exists max_students integer not null default 12;
alter table public.robotics_groups add column if not exists status text not null default 'active';
alter table public.robotics_groups add column if not exists notes text;

create table if not exists public.robotics_mentors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  photo_url text,
  name text not null,
  phone text not null,
  position text not null,
  teams text,
  groups text,
  schedule text,
  efficiency numeric(5,2) not null default 0,
  reviews text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_families (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_name text not null,
  phone text not null,
  address text,
  children text not null,
  family_discount numeric(12,2) not null default 0,
  comments text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  assignee text not null,
  due_date date,
  priority text not null default 'medium',
  status text not null default 'новая',
  checklist text,
  comments text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_inventory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null,
  quantity integer not null default 1,
  price numeric(12,2) not null default 0,
  condition text not null default 'good',
  location text not null,
  responsible text not null,
  unique_id text not null,
  created_at timestamptz not null default now(),
  unique(company_id, unique_id)
);

create table if not exists public.robotics_salaries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  mentor_name text not null,
  salary_month text not null,
  rate numeric(12,2) not null default 0,
  lessons_count integer not null default 0,
  bonuses numeric(12,2) not null default 0,
  penalties numeric(12,2) not null default 0,
  total_salary numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_grades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  student_name text not null,
  group_name text,
  mentor_name text,
  score numeric(5,2) not null default 0,
  grade_date date not null default current_date,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.robotics_grades add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.robotics_grades add column if not exists student_name text;
alter table public.robotics_grades add column if not exists group_name text;
alter table public.robotics_grades add column if not exists mentor_name text;
alter table public.robotics_grades add column if not exists score numeric(5,2) not null default 0;
alter table public.robotics_grades alter column score type numeric(5,2) using score::numeric(5,2);
alter table public.robotics_grades add column if not exists grade_date date not null default current_date;
alter table public.robotics_grades add column if not exists comment text;
alter table public.robotics_grades add column if not exists created_at timestamptz not null default now();

create table if not exists public.robotics_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  student_name text not null,
  group_name text,
  mentor_name text,
  skill text not null,
  score numeric(5,2) not null default 0,
  feedback_date date not null default current_date,
  status text not null default 'новый',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_learning (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lesson_number integer not null default 1,
  title text not null,
  concept text not null,
  course text not null default 'SPIKE Prime',
  level text not null default 'beginner',
  explanation text,
  practice text,
  checklist text,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  course text not null default 'SPIKE Prime',
  lesson_number integer,
  level text,
  goal text,
  materials text,
  instructions text,
  checklist text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.robotics_team (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role text not null default 'mentor',
  phone text,
  email text,
  groups text,
  permissions text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'robotics_students','robotics_payments','robotics_attendance','robotics_lessons',
    'robotics_trial_lessons','robotics_subscriptions','robotics_groups','robotics_mentors',
    'robotics_families','robotics_feedback','robotics_learning','robotics_tasks',
    'robotics_inventory','robotics_methods','robotics_salaries','robotics_team','robotics_grades'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "Members can read %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can insert %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can update %1$s" on public.%1$I', tbl);
    execute format('drop policy if exists "Managers can delete %1$s" on public.%1$I', tbl);
    execute format('create policy "Members can read %1$s" on public.%1$I for select using (public.is_company_member(company_id))', tbl);
    execute format('create policy "Managers can insert %1$s" on public.%1$I for insert with check (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
    execute format('create policy "Managers can update %1$s" on public.%1$I for update using (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
    execute format('create policy "Managers can delete %1$s" on public.%1$I for delete using (public.has_company_role(company_id, array[''founder'',''admin'',''manager'']::public.member_role[]))', tbl);
  end loop;
end $$;
