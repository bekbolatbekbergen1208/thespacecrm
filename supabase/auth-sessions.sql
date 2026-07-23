create table if not exists public.crm_auth_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  user_agent text,
  ip_address text,
  signed_in_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  signed_out_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, device_id)
);

alter table public.crm_auth_devices enable row level security;

drop policy if exists "Users can read own auth devices" on public.crm_auth_devices;
drop policy if exists "Users can insert own auth devices" on public.crm_auth_devices;
drop policy if exists "Users can update own auth devices" on public.crm_auth_devices;
drop policy if exists "Users can delete own auth devices" on public.crm_auth_devices;

create policy "Users can read own auth devices"
on public.crm_auth_devices
for select
using (user_id = auth.uid());

create policy "Users can insert own auth devices"
on public.crm_auth_devices
for insert
with check (user_id = auth.uid());

create policy "Users can update own auth devices"
on public.crm_auth_devices
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own auth devices"
on public.crm_auth_devices
for delete
using (user_id = auth.uid());

create index if not exists crm_auth_devices_user_last_seen_idx
on public.crm_auth_devices (user_id, last_seen_at desc);

create index if not exists crm_auth_devices_user_active_idx
on public.crm_auth_devices (user_id, signed_out_at)
where signed_out_at is null;

notify pgrst, 'reload schema';
