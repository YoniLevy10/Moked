-- Align Supabase tenants with Neon product.sql subscription / bot / outbound columns.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

do $$ begin
  create type public.subscription_status as enum (
    'inactive', 'pending', 'active', 'past_due', 'canceled'
  );
exception when duplicate_object then null;
end $$;

alter table public.tenants
  add column if not exists subscription_status public.subscription_status not null default 'inactive',
  add column if not exists subscription_renews_at timestamptz,
  add column if not exists subscription_provider text,
  add column if not exists subscription_external_id text,
  add column if not exists subscription_invoice_id text,
  add column if not exists monthly_outbound_cap integer not null default 1000,
  add column if not exists outbound_count integer not null default 0,
  add column if not exists outbound_period text,
  add column if not exists bot_draft text not null default '',
  add column if not exists bot_answers jsonb not null default '{}'::jsonb,
  add column if not exists bot_approved text,
  add column if not exists bot_approved_at timestamptz;

create index if not exists tenants_subscription_external_id_idx
  on public.tenants (subscription_external_id)
  where subscription_external_id is not null;

create index if not exists conversations_payment_external_id_idx
  on public.conversations (payment_external_id)
  where payment_external_id is not null;
