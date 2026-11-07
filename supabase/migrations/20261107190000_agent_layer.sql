-- Agent layer: conversation memory + tenant knowledge grounding store.
-- pricing_items remains the only price source; knowledge mirrors it for retrieval.

alter table public.conversations
  add column if not exists agent jsonb not null default '{}'::jsonb;

create table if not exists public.tenant_knowledge (
  id text primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  label text not null,
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists tenant_knowledge_tenant_kind_idx
  on public.tenant_knowledge (tenant_id, kind);

alter table public.tenant_knowledge enable row level security;

create policy tenant_knowledge_all_own
  on public.tenant_knowledge for all to authenticated
  using (public.owns_tenant(tenant_id))
  with check (public.owns_tenant(tenant_id));
