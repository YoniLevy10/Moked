-- Meta connectivity: delivery tracking + quality + CTWA referral + feature flags

alter table public.messages
  add column if not exists delivery_status text
    check (delivery_status is null or delivery_status in ('pending','sent','delivered','read','failed')),
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists media_url text,
  add column if not exists media_mime text,
  add column if not exists interactive_payload jsonb;

create index if not exists messages_delivery_status_idx
  on public.messages (tenant_id, delivery_status);

alter table public.tenants
  add column if not exists quality_rating text
    check (quality_rating is null or quality_rating in ('GREEN','YELLOW','RED','UNKNOWN')),
  add column if not exists quality_checked_at timestamptz,
  add column if not exists messaging_limit_tier text,
  add column if not exists meta_features jsonb not null default '{}'::jsonb;

alter table public.conversations
  add column if not exists ctwa_source_id text,
  add column if not exists ctwa_body text,
  add column if not exists referral jsonb;
