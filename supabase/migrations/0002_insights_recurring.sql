-- ============================================================
-- AI features: cached insights + recurring subscription detection
-- ============================================================

create table if not exists public.insights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day_key       date not null,
  content       jsonb not null,
  generated_at  timestamptz not null default now(),
  unique (user_id, day_key)
);
create index if not exists insights_user_day on public.insights(user_id, day_key desc);

alter table public.insights enable row level security;
drop policy if exists "own_insights" on public.insights;
create policy "own_insights" on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  merchant_id         uuid not null references public.merchants(id) on delete cascade,
  cadence             text not null check (cadence in ('weekly','monthly','quarterly','annual')),
  expected_amount_qar numeric(12,2) not null,
  confidence          numeric(3,2) not null,
  next_expected_date  date,
  active              boolean not null default true,
  detected_at         timestamptz not null default now(),
  unique (user_id, merchant_id)
);
create index if not exists subscriptions_user on public.subscriptions(user_id, active);

alter table public.subscriptions enable row level security;
drop policy if exists "own_subs" on public.subscriptions;
create policy "own_subs" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
