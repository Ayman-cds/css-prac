-- ============================================================
-- QNB AI Expense Dashboard — initial schema
-- Single-user app. RLS enforces auth.uid() = user_id.
-- /api/ingest uses the service role and scopes by INGEST_USER_ID env.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  name        text not null,
  emoji       text not null default '📦',
  color       text not null default '#7c5cff',
  is_system   boolean not null default false,
  sort_order  int not null default 0,
  budget_qar  numeric(12,2),
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);

-- ============================================================
-- MERCHANTS (categorization cache + learned rules)
-- ============================================================
create table if not exists public.merchants (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  normalized_name   text not null,
  display_name      text not null,
  category_id       uuid references public.categories(id) on delete set null,
  confidence        numeric(3,2),
  source            text not null check (source in ('ai','rule','manual','fallback','cache')),
  reasoning         text,
  times_seen        int not null default 1,
  total_spent_qar   numeric(14,2) not null default 0,
  first_seen        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (user_id, normalized_name)
);
create index if not exists merchants_user_lookup on public.merchants(user_id, normalized_name);
create index if not exists merchants_trgm on public.merchants using gin (normalized_name gin_trgm_ops);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  occurred_at         timestamptz not null default now(),
  card_last_digit     text,
  amount_qar          numeric(12,2) not null,
  is_approximate      boolean not null default false,
  merchant_raw        text not null,
  merchant_normalized text not null,
  merchant_id         uuid references public.merchants(id) on delete set null,
  category_id         uuid references public.categories(id) on delete set null,
  category_confidence numeric(3,2),
  balance_qar         numeric(14,2),
  raw_sms             text not null,
  sms_hash            text not null,
  notes               text,
  user_corrected      boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (user_id, sms_hash)
);
create index if not exists tx_user_occurred on public.transactions(user_id, occurred_at desc);
create index if not exists tx_user_category on public.transactions(user_id, category_id, occurred_at desc);
create index if not exists tx_user_merchant on public.transactions(user_id, merchant_id);
create index if not exists tx_merchant_trgm on public.transactions using gin (merchant_raw gin_trgm_ops);
create index if not exists tx_merchant_norm_trgm on public.transactions using gin (merchant_normalized gin_trgm_ops);

-- ============================================================
-- BUDGETS
-- ============================================================
create table if not exists public.budgets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete cascade,
  monthly_limit   numeric(12,2) not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, category_id)
);

-- ============================================================
-- TRIGGER: keep merchants aggregates in sync
-- ============================================================
create or replace function public.tx_update_merchant_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.merchant_id is null then
    return new;
  end if;
  update public.merchants
     set times_seen      = times_seen + 1,
         total_spent_qar = total_spent_qar + new.amount_qar,
         last_seen_at    = new.occurred_at
   where id = new.merchant_id;
  return new;
end
$$;

drop trigger if exists tx_merchant_stats_trg on public.transactions;
create trigger tx_merchant_stats_trg
after insert on public.transactions
for each row execute function public.tx_update_merchant_stats();

-- ============================================================
-- RLS
-- ============================================================
alter table public.categories   enable row level security;
alter table public.merchants    enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

drop policy if exists "own_categories" on public.categories;
create policy "own_categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_merchants" on public.merchants;
create policy "own_merchants" on public.merchants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_transactions" on public.transactions;
create policy "own_transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_budgets" on public.budgets;
create policy "own_budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- SEED — runs idempotently. Picks the first auth.users row.
-- Re-run this block after your first magic-link login.
-- ============================================================
do $$
declare
  uid uuid;
  cat_dining       uuid;
  cat_delivery     uuid;
  cat_groceries    uuid;
  cat_transport    uuid;
  cat_shopping     uuid;
  cat_entertain    uuid;
  cat_health       uuid;
  cat_bills        uuid;
  cat_travel       uuid;
  cat_cash         uuid;
  cat_other        uuid;
  m_brd            uuid;
  m_common         uuid;
  m_uber           uuid;
  m_snoonu         uuid;
  m_battery        uuid;
begin
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is null then
    raise notice '[qnb seed] No auth user yet. Sign in via magic link, then re-run this DO block.';
    return;
  end if;

  -- ---- categories ----
  insert into public.categories (user_id, slug, name, emoji, color, is_system, sort_order) values
    (uid, 'dining',        'Food & Dining',       '🍽️', '#ff8b3d', true, 1),
    (uid, 'food-delivery', 'Food Delivery',       '🛵', '#ff5a5f', true, 2),
    (uid, 'groceries',     'Groceries',           '🛒', '#3ecf8e', true, 3),
    (uid, 'transport',     'Transport',           '🚗', '#4dabf7', true, 4),
    (uid, 'shopping',      'Shopping',            '🛍️', '#cc5de8', true, 5),
    (uid, 'entertainment', 'Entertainment',       '🎬', '#e64980', true, 6),
    (uid, 'health',        'Health & Wellness',   '🏥', '#fa5252', true, 7),
    (uid, 'bills',         'Utilities & Bills',   '💡', '#9a9aa8', true, 8),
    (uid, 'travel',        'Travel',              '✈️', '#15aabf', true, 9),
    (uid, 'cash',          'Cash Advance',        '💵', '#82c91e', true, 10),
    (uid, 'other',         'Other',               '📦', '#7c5cff', true, 99)
  on conflict (user_id, slug) do nothing;

  select id into cat_dining    from public.categories where user_id=uid and slug='dining';
  select id into cat_delivery  from public.categories where user_id=uid and slug='food-delivery';
  select id into cat_groceries from public.categories where user_id=uid and slug='groceries';
  select id into cat_transport from public.categories where user_id=uid and slug='transport';
  select id into cat_shopping  from public.categories where user_id=uid and slug='shopping';
  select id into cat_entertain from public.categories where user_id=uid and slug='entertainment';
  select id into cat_health    from public.categories where user_id=uid and slug='health';
  select id into cat_bills     from public.categories where user_id=uid and slug='bills';
  select id into cat_travel    from public.categories where user_id=uid and slug='travel';
  select id into cat_cash      from public.categories where user_id=uid and slug='cash';
  select id into cat_other     from public.categories where user_id=uid and slug='other';

  -- ---- merchants ----
  insert into public.merchants (user_id, normalized_name, display_name, category_id, confidence, source) values
    (uid, 'BRD ROTISERIE RESTAURA', 'BRD Rotiserie Restaurant', cat_dining,    0.95, 'rule'),
    (uid, 'COMMON ROOM REST',       'Common Room',              cat_dining,    0.95, 'rule'),
    (uid, 'UBER',                   'Uber',                     cat_transport, 0.99, 'rule'),
    (uid, 'SNOONU TRADING',         'Snoonu',                   cat_delivery,  0.99, 'rule'),
    (uid, 'BATTERY',                'Battery (truncated)',      cat_shopping,  0.65, 'rule')
  on conflict (user_id, normalized_name) do nothing;

  select id into m_brd     from public.merchants where user_id=uid and normalized_name='BRD ROTISERIE RESTAURA';
  select id into m_common  from public.merchants where user_id=uid and normalized_name='COMMON ROOM REST';
  select id into m_uber    from public.merchants where user_id=uid and normalized_name='UBER';
  select id into m_snoonu  from public.merchants where user_id=uid and normalized_name='SNOONU TRADING';
  select id into m_battery from public.merchants where user_id=uid and normalized_name='BATTERY';

  -- ---- transactions (PRD §17, plus a prior-month row for vs-last-month) ----
  -- Disable the stats trigger during seeding so we don't double-count.
  alter table public.transactions disable trigger tx_merchant_stats_trg;

  insert into public.transactions (
    user_id, occurred_at, card_last_digit, amount_qar, is_approximate,
    merchant_raw, merchant_normalized, merchant_id, category_id, category_confidence,
    balance_qar, raw_sms, sms_hash, user_corrected
  ) values
    (uid, now() - interval '1 day' + time '13:21', '8', 736.00, false,
     'BRD ROTISERIE RESTAURA', 'BRD ROTISERIE RESTAURA', m_brd, cat_dining, 0.95,
     3974.90, '[seed] BRD ROTISERIE RESTAURA', 'seed_brd_1', false),
    (uid, now() - interval '1 day' + time '20:10', '8', 73.00, false,
     'COMMON ROOM REST', 'COMMON ROOM REST', m_common, cat_dining, 0.95,
     3901.90, '[seed] COMMON ROOM REST', 'seed_common_1', false),
    (uid, now() + time '08:14',                   '9', 7.74,  false,
     'UBER * PENDING', 'UBER', m_uber, cat_transport, 0.99,
     3894.16, '[seed] UBER * PENDING 7.74', 'seed_uber_1', false),
    (uid, now() + time '09:02',                   '9', 16.97, false,
     'UBER * PENDING', 'UBER', m_uber, cat_transport, 0.99,
     3877.19, '[seed] UBER * PENDING 16.97', 'seed_uber_2', false),
    (uid, now() + time '11:30',                   '9', 9.21,  false,
     'UBER * PENDING', 'UBER', m_uber, cat_transport, 0.99,
     3867.98, '[seed] UBER * PENDING 9.21', 'seed_uber_3', false),
    (uid, now() + time '14:45',                   '9', 5.29,  false,
     'UBER * PENDING', 'UBER', m_uber, cat_transport, 0.99,
     3862.69, '[seed] UBER * PENDING 5.29', 'seed_uber_4', false),
    (uid, now() + time '17:22',                   '9', 7.84,  false,
     'UBR* PENDING.UBER.COM', 'UBER', m_uber, cat_transport, 0.99,
     3854.85, '[seed] UBR* PENDING.UBER.COM 7.84', 'seed_uber_5', false),
    (uid, now() + time '19:11',                   '9', 9.10,  false,
     'UBR* PENDING.UBER.COM', 'UBER', m_uber, cat_transport, 0.99,
     3845.75, '[seed] UBR* PENDING.UBER.COM 9.10', 'seed_uber_6', false),
    (uid, now() + time '20:48',                   '9', 35.00, false,
     'SNOONU TRADING', 'SNOONU TRADING', m_snoonu, cat_delivery, 0.99,
     3810.75, '[seed] SNOONU TRADING', 'seed_snoonu_1', false),
    (uid, now() + time '21:30',                   '8', 73.00, false,
     'BATTERY...', 'BATTERY', m_battery, cat_shopping, 0.65,
     3737.75, '[seed] BATTERY... (truncated)', 'seed_battery_1', false),
    -- prior month row so "vs last month" has signal
    (uid, now() - interval '32 days', '8', 412.50, false,
     'CARREFOUR CITY CENTER', 'CARREFOUR CITY CENTER', null, cat_groceries, 0.95,
     5200.00, '[seed] CARREFOUR (last month)', 'seed_lastmonth_1', false)
  on conflict (user_id, sms_hash) do nothing;

  alter table public.transactions enable trigger tx_merchant_stats_trg;

  -- refresh merchant aggregates from seeded rows
  update public.merchants m set
    times_seen      = sub.cnt,
    total_spent_qar = sub.total,
    last_seen_at    = sub.last_at
  from (
    select merchant_id, count(*) as cnt, sum(amount_qar) as total, max(occurred_at) as last_at
    from public.transactions
    where user_id = uid and merchant_id is not null
    group by merchant_id
  ) sub
  where m.id = sub.merchant_id;

  -- ---- budgets ----
  insert into public.budgets (user_id, category_id, monthly_limit) values
    (uid, cat_dining,    800.00),
    (uid, cat_groceries, 2500.00),
    (uid, cat_transport, 500.00)
  on conflict (user_id, category_id) do nothing;

  raise notice '[qnb seed] Done. Set INGEST_USER_ID=% in .env.local', uid;
end $$;
