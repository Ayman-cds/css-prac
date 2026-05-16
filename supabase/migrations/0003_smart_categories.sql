-- ============================================================
-- Smart Categories — natural-language saved filters
-- ============================================================

create table if not exists public.smart_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  emoji       text not null default '✨',
  color       text not null default '#7c5cff',
  prompt      text not null,           -- original NL description
  filter      jsonb not null,          -- structured filter spec
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists smart_categories_user on public.smart_categories(user_id, sort_order);

alter table public.smart_categories enable row level security;
drop policy if exists "own_smart_categories" on public.smart_categories;
create policy "own_smart_categories" on public.smart_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
