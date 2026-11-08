-- P0 webhook durability: delivery/read/failed timestamps on messages.
-- Template lifecycle lives elsewhere; webhook_events table already exists.

alter table public.messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists error_code text;
