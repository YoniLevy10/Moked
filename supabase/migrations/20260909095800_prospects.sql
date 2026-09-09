-- Internal GTM prospects for product-validation outreach (superadmin only).

create type public.prospect_status as enum (
  'new',
  'contacted',
  'replied',
  'interested',
  'not_interested',
  'demo_scheduled',
  'pilot',
  'converted',
  'discarded'
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  phone text not null,
  vertical public.business_vertical not null default 'other',
  source text not null default 'manual',
  status public.prospect_status not null default 'new',
  notes text not null default '',
  last_outreach_at timestamptz,
  last_outreach_channel text,
  interest_score integer check (interest_score is null or (interest_score >= 0 and interest_score <= 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_status_updated_idx
  on public.prospects (status, updated_at desc);

create index prospects_phone_idx on public.prospects (phone);

create trigger prospects_set_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();

alter table public.prospects enable row level security;

-- Superadmin-only via service role in app; no authenticated policies for owners.
-- Defense in depth: allow select/all only for is_superadmin().
create policy prospects_superadmin_all
  on public.prospects for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
