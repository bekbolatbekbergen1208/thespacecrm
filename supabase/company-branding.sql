alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists brand_phrase text;

notify pgrst, 'reload schema';
