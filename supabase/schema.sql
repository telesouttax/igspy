-- Rode isso no SQL Editor do seu projeto Supabase (uma vez só)

create table if not exists instagram_accounts (
  ig_account_id text primary key,
  page_access_token text not null,
  updated_at timestamptz not null default now()
);

create table if not exists scraped_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  niche text,
  raw_data jsonb not null,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  scraped_profile_id uuid references scraped_profiles(id) on delete cascade,
  insight jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scraped_profiles_niche on scraped_profiles(niche);
create index if not exists idx_insights_profile on insights(scraped_profile_id);
