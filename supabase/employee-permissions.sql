alter table public.company_members
  add column if not exists allowed_routes text[] not null default array[]::text[];

notify pgrst, 'reload schema';
