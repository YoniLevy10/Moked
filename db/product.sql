-- Subscription, approved bot instructions, and the phone pool.
-- The pool starts empty. Billing stays pending until a signed webhook arrives.

create type public.subscription_status as enum (
  'inactive', 'pending', 'active', 'past_due', 'canceled'
);

create type public.phone_number_status as enum (
  'available', 'reserved', 'awaiting_code', 'registering',
  'pending_name', 'live', 'suspended', 'cooldown', 'banned'
);

create type public.pool_number_kind as enum ('live', 'demo');

alter table public.tenants
  add column subscription_status public.subscription_status not null default 'inactive',
  add column subscription_renews_at timestamptz,
  add column subscription_provider text,
  add column subscription_external_id text,
  add column subscription_invoice_id text,
  add column monthly_outbound_cap integer not null default 1000,
  add column outbound_count integer not null default 0,
  add column outbound_period text,
  add column bot_draft text not null default '',
  add column bot_answers jsonb not null default '{}'::jsonb,
  add column bot_approved text,
  add column bot_approved_at timestamptz;

create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  e164 text not null,
  national text not null,
  kind public.pool_number_kind not null default 'live',
  status public.phone_number_status not null default 'available',
  tenant_id uuid references public.tenants (id) on delete set null,
  phone_number_id text,
  display_name text,
  pin_cipher text,
  last_error text,
  last_code text,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index phone_numbers_e164_uidx on public.phone_numbers (e164);
create index phone_numbers_status_idx on public.phone_numbers (status);
create index phone_numbers_tenant_idx on public.phone_numbers (tenant_id);

create trigger phone_numbers_set_updated_at
  before update on public.phone_numbers
  for each row execute function public.set_updated_at();
