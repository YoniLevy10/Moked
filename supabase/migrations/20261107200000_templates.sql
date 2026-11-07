-- Hebrew utility Message Templates (Meta lifecycle).

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  language text not null default 'he',
  category text not null default 'UTILITY',
  components jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  meta_id text,
  rejection_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name, language)
);

create index if not exists templates_tenant_status_idx
  on public.templates (tenant_id, status);

create index if not exists templates_meta_id_idx
  on public.templates (meta_id)
  where meta_id is not null;

alter table public.templates enable row level security;
