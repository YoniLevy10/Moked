-- Business outcome events — MOKED differentiation layer.
-- Conversations become measurable business results; WhatsApp is only a channel.

create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  -- Stable event name, e.g. lead.created, booking.confirmed, payment.paid
  event_type text not null,
  -- Optional structured payload (amounts, scores, channel metadata)
  payload jsonb not null default '{}'::jsonb,
  -- Channel that carried the interaction (replaceable: whatsapp | sms | web | ...)
  channel text not null default 'whatsapp',
  created_at timestamptz not null default now()
);

create index business_events_tenant_created_idx
  on public.business_events (tenant_id, created_at desc);

create index business_events_tenant_type_idx
  on public.business_events (tenant_id, event_type);

create index business_events_conversation_idx
  on public.business_events (conversation_id)
  where conversation_id is not null;

alter table public.business_events enable row level security;

create policy business_events_all_own
  on public.business_events for all to authenticated
  using (public.owns_tenant(tenant_id))
  with check (public.owns_tenant(tenant_id));
