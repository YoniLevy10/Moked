-- MOKED core schema (multi-tenant WhatsApp process OS)
-- Maps 1:1 to src/lib/types.ts + auth profiles.
-- Apply on a dedicated MOKED Supabase project (not Bamakor/Naaryo).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('superadmin', 'owner');
create type public.business_vertical as enum (
  'clinic', 'trades', 'coach', 'beauty', 'realty', 'other'
);
create type public.whatsapp_mode as enum ('demo', 'live');
create type public.process_key as enum (
  'intake',
  'qualification',
  'booking',
  'reminders',
  'retention',
  'quote',
  'payment'
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

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role public.user_role not null default 'owner',
  tenant_id uuid, -- FK added after tenants
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text not null,
  phone text not null default '',
  vertical public.business_vertical not null default 'other',
  locale text not null default 'he-IL' check (locale = 'he-IL'),
  -- WhatsApp connection (token lives in tenant_secrets)
  whatsapp_connected boolean not null default false,
  whatsapp_mode public.whatsapp_mode not null default 'demo',
  waba_id text,
  phone_number_id text,
  display_phone text,
  whatsapp_connected_at timestamptz,
  -- Integrations
  google_calendar boolean not null default false,
  payments_provider public.payments_provider not null default 'none',
  invoicing_provider public.invoicing_provider not null default 'none',
  google_reviews_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tenants_phone_number_id_uidx
  on public.tenants (phone_number_id)
  where phone_number_id is not null;

alter table public.profiles
  add constraint profiles_tenant_id_fkey
  foreign key (tenant_id) references public.tenants (id) on delete set null;

-- Sensitive tokens: never exposed via anon/authenticated RLS (service_role only)
create table public.tenant_secrets (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  whatsapp_access_token text,
  updated_at timestamptz not null default now()
);

-- Process enablement + config per tenant
create table public.tenant_processes (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  process_key public.process_key not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  primary key (tenant_id, process_key)
);

-- Pricing catalog (Wave C)
create table public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  price_ils numeric(12, 2) not null check (price_ils >= 0),
  description text,
  created_at timestamptz not null default now()
);

create index pricing_items_tenant_id_idx on public.pricing_items (tenant_id);

-- ---------------------------------------------------------------------------
-- Conversations + messages
-- ---------------------------------------------------------------------------
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
  -- Booking (Wave A/B)
  booking_proposed_slots jsonb not null default '[]'::jsonb,
  booking_confirmed_at timestamptz,
  booking_reminder_24_sent boolean not null default false,
  booking_reminder_2_sent boolean not null default false,
  booking_attended boolean,
  booking_address text,
  -- Quote (Wave C)
  quote_item_id uuid references public.pricing_items (id) on delete set null,
  quote_amount_ils numeric(12, 2),
  quote_status public.quote_status,
  -- Payment (Wave D)
  payment_link_url text,
  payment_status public.payment_status not null default 'none',
  payment_provider text,
  payment_external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_tenant_updated_idx
  on public.conversations (tenant_id, updated_at desc);
create index conversations_tenant_customer_open_idx
  on public.conversations (tenant_id, customer_wa_id)
  where status <> 'closed';
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
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index messages_tenant_created_idx
  on public.messages (tenant_id, created_at desc);
create unique index messages_meta_message_id_uidx
  on public.messages (meta_message_id)
  where meta_message_id is not null;

-- Idempotency for Meta webhooks
create table public.webhook_events (
  id text primary key, -- Meta wamid / delivery id
  tenant_id uuid references public.tenants (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Auth helpers + RLS
-- ---------------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  );
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_id
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.owns_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
    or public.current_tenant_id() = p_tenant_id;
$$;

revoke all on function public.is_superadmin() from public;
revoke all on function public.current_tenant_id() from public;
revoke all on function public.owns_tenant(uuid) from public;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.owns_tenant(uuid) to authenticated;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text := coalesce(current_setting('app.admin_emails', true), '');
  is_admin boolean := position(lower(new.email) in lower(admin_emails)) > 0
    and length(trim(new.email)) > 0
    and length(trim(admin_emails)) > 0;
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when is_admin then 'superadmin'::public.user_role else 'owner'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed Wave A processes when a tenant is created
create or replace function public.seed_tenant_processes()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_secrets enable row level security;
alter table public.tenant_processes enable row level security;
alter table public.pricing_items enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_events enable row level security;

-- profiles
create policy profiles_select_self_or_admin
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_superadmin());

create policy profiles_update_self_or_admin
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

create policy profiles_admin_insert
  on public.profiles for insert to authenticated
  with check (public.is_superadmin() or id = auth.uid());

-- tenants
create policy tenants_select_own
  on public.tenants for select to authenticated
  using (public.owns_tenant(id));

create policy tenants_insert_auth
  on public.tenants for insert to authenticated
  with check (true);

create policy tenants_update_own
  on public.tenants for update to authenticated
  using (public.owns_tenant(id))
  with check (public.owns_tenant(id));

create policy tenants_delete_admin
  on public.tenants for delete to authenticated
  using (public.is_superadmin());

-- tenant_secrets: NO policies for authenticated/anon — service_role only
-- (intentional: WhatsApp tokens never leave the server)

-- tenant_processes
create policy tenant_processes_all_own
  on public.tenant_processes for all to authenticated
  using (public.owns_tenant(tenant_id))
  with check (public.owns_tenant(tenant_id));

-- pricing_items
create policy pricing_items_all_own
  on public.pricing_items for all to authenticated
  using (public.owns_tenant(tenant_id))
  with check (public.owns_tenant(tenant_id));

-- conversations
create policy conversations_all_own
  on public.conversations for all to authenticated
  using (public.owns_tenant(tenant_id))
  with check (public.owns_tenant(tenant_id));

-- messages
create policy messages_all_own
  on public.messages for all to authenticated
  using (public.owns_tenant(tenant_id))
  with check (public.owns_tenant(tenant_id));

-- webhook_events: service_role only (no authenticated policies)

-- ---------------------------------------------------------------------------
-- Convenience view matching app Tenant shape (without secrets)
-- ---------------------------------------------------------------------------
create or replace view public.tenants_with_processes
with (security_invoker = true)
as
select
  t.*,
  coalesce(
    (
      select jsonb_object_agg(tp.process_key, jsonb_build_object(
        'enabled', tp.enabled,
        'config', tp.config
      ))
      from public.tenant_processes tp
      where tp.tenant_id = t.id
    ),
    '{}'::jsonb
  ) as processes,
  coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'name', pi.name,
        'priceIls', pi.price_ils,
        'description', pi.description
      ) order by pi.created_at)
      from public.pricing_items pi
      where pi.tenant_id = t.id
    ),
    '[]'::jsonb
  ) as pricing
from public.tenants t;

grant select on public.tenants_with_processes to authenticated;
