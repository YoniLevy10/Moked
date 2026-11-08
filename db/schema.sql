-- Moked schema for Neon Postgres.
-- The app connects as the database owner and enforces access in its own session.
-- Profiles stand on their own: there is no Supabase auth.users table.

create extension if not exists pgcrypto;

create type public.user_role as enum ('superadmin', 'owner');
create type public.business_vertical as enum (
  'clinic', 'trades', 'coach', 'beauty', 'realty', 'other'
);
create type public.whatsapp_mode as enum ('demo', 'live');
create type public.process_key as enum (
  'intake', 'qualification', 'booking', 'reminders', 'retention', 'quote', 'payment'
);
create type public.conversation_status as enum ('open', 'human_takeover', 'closed');
create type public.lead_intent as enum ('sales', 'support', 'spam', 'unknown');
create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_type as enum ('text', 'template', 'interactive', 'system');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected');
create type public.payment_status as enum ('none', 'link_sent', 'paid', 'failed');
create type public.payments_provider as enum (
  'none', 'demo', 'grow', 'payplus', 'tranzila', 'cardcom'
);
create type public.invoicing_provider as enum (
  'none', 'icount', 'morning', 'greeninvoice'
);
create type public.prospect_status as enum (
  'new', 'contacted', 'replied', 'interested', 'not_interested',
  'demo_scheduled', 'pilot', 'converted', 'discarded'
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  role public.user_role not null default 'owner',
  tenant_id uuid,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text not null,
  phone text not null default '',
  vertical public.business_vertical not null default 'other',
  locale text not null default 'he-IL' check (locale = 'he-IL'),
  whatsapp_connected boolean not null default false,
  whatsapp_mode public.whatsapp_mode not null default 'demo',
  waba_id text,
  phone_number_id text,
  display_phone text,
  whatsapp_connected_at timestamptz,
  google_calendar boolean not null default false,
  payments_provider public.payments_provider not null default 'none',
  invoicing_provider public.invoicing_provider not null default 'none',
  google_reviews_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_tenant_id_fkey
  foreign key (tenant_id) references public.tenants (id) on delete set null;

create unique index tenants_phone_number_id_uidx
  on public.tenants (phone_number_id)
  where phone_number_id is not null;

create table public.tenant_secrets (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  whatsapp_access_token text,
  updated_at timestamptz not null default now()
);

create table public.tenant_processes (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  process_key public.process_key not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  primary key (tenant_id, process_key)
);

create table public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  price_ils numeric(12, 2) not null check (price_ils >= 0),
  description text,
  created_at timestamptz not null default now()
);

create index pricing_items_tenant_id_idx on public.pricing_items (tenant_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_wa_id text not null,
  customer_name text,
  status public.conversation_status not null default 'open',
  lead_score integer,
  intent public.lead_intent not null default 'unknown',
  active_process public.process_key,
  process_state jsonb not null default '{}'::jsonb,
  booking_proposed_slots jsonb not null default '[]'::jsonb,
  booking_confirmed_at timestamptz,
  booking_reminder_24_sent boolean not null default false,
  booking_reminder_2_sent boolean not null default false,
  booking_attended boolean,
  booking_address text,
  quote_item_id uuid references public.pricing_items (id) on delete set null,
  quote_amount_ils numeric(12, 2),
  quote_status public.quote_status,
  payment_link_url text,
  payment_status public.payment_status not null default 'none',
  payment_provider text,
  payment_external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_tenant_updated_idx
  on public.conversations (tenant_id, updated_at desc);
create unique index conversations_one_open_per_customer_uidx
  on public.conversations (tenant_id, customer_wa_id)
  where status <> 'closed';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  direction public.message_direction not null,
  body text not null default '',
  type public.message_type not null default 'text',
  process_key public.process_key,
  meta_message_id text,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create unique index messages_meta_message_id_uidx
  on public.messages (meta_message_id)
  where meta_message_id is not null;

create table public.webhook_events (
  id text primary key,
  tenant_id uuid references public.tenants (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  channel text not null default 'whatsapp',
  created_at timestamptz not null default now()
);

create index business_events_tenant_created_idx
  on public.business_events (tenant_id, created_at desc);

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
  interest_score integer check (
    interest_score is null or (interest_score >= 0 and interest_score <= 5)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_status_updated_idx
  on public.prospects (status, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create trigger tenant_secrets_set_updated_at
  before update on public.tenant_secrets
  for each row execute function public.set_updated_at();

create trigger prospects_set_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();

create or replace function public.seed_tenant_processes()
returns trigger
language plpgsql
as $$
begin
  insert into public.tenant_processes (tenant_id, process_key, enabled)
  values
    (new.id, 'intake', true),
    (new.id, 'qualification', true),
    (new.id, 'booking', true),
    (new.id, 'reminders', false),
    (new.id, 'retention', false),
    (new.id, 'quote', false),
    (new.id, 'payment', false)
  on conflict do nothing;

  insert into public.pricing_items (tenant_id, name, price_ils, description)
  values
    (new.id, 'פגישת ייעוץ', 250, 'פגישה ראשונית'),
    (new.id, 'חבילת שירות', 900, 'חבילה בסיסית');

  insert into public.tenant_secrets (tenant_id) values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

create trigger tenants_seed_processes
  after insert on public.tenants
  for each row execute function public.seed_tenant_processes();
