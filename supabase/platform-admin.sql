-- CRM.Space owner login setup
-- Run this whole file in Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.subscription_status as enum ('trial', 'active', 'past_due', 'blocked');
exception
  when duplicate_object then null;
end $$;

alter table public.companies
  add column if not exists subscription_status public.subscription_status not null default 'trial';

alter table public.companies
  add column if not exists subscription_due_date date not null default (current_date + interval '14 days');

alter table public.companies
  add column if not exists monthly_fee numeric(12,2) not null default 0;

alter table public.companies
  add column if not exists blocked_at timestamptz;

alter table public.companies
  add column if not exists last_paid_at timestamptz;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  unique(user_id)
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

alter table public.platform_admins enable row level security;
alter table public.platform_subscription_payments enable row level security;

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

drop policy if exists "Platform admins can read admin list" on public.platform_admins;
drop policy if exists "Platform admins can read companies" on public.companies;
drop policy if exists "Platform admins can update companies" on public.companies;
drop policy if exists "Platform admins can read subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can insert subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can update subscription payments" on public.platform_subscription_payments;
drop policy if exists "Platform admins can delete subscription payments" on public.platform_subscription_payments;

create policy "Platform admins can read admin list"
on public.platform_admins
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

create policy "Platform admins can read companies"
on public.companies
for select
using (public.is_platform_admin());

create policy "Platform admins can update companies"
on public.companies
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admins can read subscription payments"
on public.platform_subscription_payments
for select
using (public.is_platform_admin());

create policy "Platform admins can insert subscription payments"
on public.platform_subscription_payments
for insert
with check (public.is_platform_admin());

create policy "Platform admins can update subscription payments"
on public.platform_subscription_payments
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admins can delete subscription payments"
on public.platform_subscription_payments
for delete
using (public.is_platform_admin());

create index if not exists companies_subscription_status_due_idx
on public.companies (subscription_status, subscription_due_date);

create index if not exists platform_subscription_payments_company_paid_idx
on public.platform_subscription_payments (company_id, paid_at desc);

do $$
declare
  admin_email text := 'BekbergenBekbolat0@gmail.com';
  admin_password text := 'Bekbolat2026!';
  admin_user_id uuid;
  identities_has_provider_id boolean;
  identities_has_id boolean;
begin
  select id into admin_user_id
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if admin_user_id is null then
    admin_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      extensions.crypt(admin_password, extensions.gen_salt('bf')),
      now(),
      now(),
      '',
      now(),
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Bekbolat Bekbergen'),
      now(),
      now()
    );
  else
    update auth.users
    set
      aud = 'authenticated',
      role = 'authenticated',
      encrypted_password = extensions.crypt(admin_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
      updated_at = now()
    where id = admin_user_id;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) into identities_has_provider_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'id'
  ) into identities_has_id;

  if not exists (
    select 1
    from auth.identities
    where user_id = admin_user_id
      and provider = 'email'
  ) then
    if identities_has_provider_id and identities_has_id then
      insert into auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        gen_random_uuid()::text,
        admin_email,
        admin_user_id,
        jsonb_build_object('sub', admin_user_id::text, 'email', admin_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      );
    elsif identities_has_provider_id then
      insert into auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        admin_email,
        admin_user_id,
        jsonb_build_object('sub', admin_user_id::text, 'email', admin_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      );
    else
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        admin_user_id::text,
        admin_user_id,
        jsonb_build_object('sub', admin_user_id::text, 'email', admin_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      );
    end if;
  end if;

  insert into public.platform_admins (user_id, email, full_name)
  values (admin_user_id, admin_email, 'Bekbolat Bekbergen')
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;
end $$;

notify pgrst, 'reload schema';
