-- Human escalation state on conversations (waiting-for-human queue).

alter table public.conversations
  add column if not exists escalation jsonb;

create index if not exists conversations_tenant_status_idx
  on public.conversations (tenant_id, status);
