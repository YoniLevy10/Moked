-- P0: owner-configured visit hours + daily capacity for trades booking slots.
-- Empty windows or dailyCapacity 0 → agent must not invent visit slots.

alter table public.tenants
  add column if not exists availability jsonb not null default jsonb_build_object(
    'timezone', 'Asia/Jerusalem',
    'windows', '[]'::jsonb,
    'dailyCapacity', 0
  );
