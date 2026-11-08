-- Persist superadmin active-tenant selection (remote DB).
-- Replaces the broken tenants[0] fallback for getActiveTenant / getDb.

create table if not exists public.platform_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

comment on table public.platform_settings is
  'Platform-wide KV (e.g. active_tenant_id for superadmin dashboard).';
