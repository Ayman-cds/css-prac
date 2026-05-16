-- ============================================================
-- Hidden transactions
--
-- Soft-hide flag. Hidden transactions are filtered out of all
-- aggregates / charts / search results by default; they can still
-- be surfaced via the "Include hidden" toggle on the Search page.
-- ============================================================

alter table public.transactions
  add column if not exists hidden boolean not null default false;

-- Index supports the default filter pattern used by every list query.
create index if not exists tx_user_visible_occurred
  on public.transactions(user_id, hidden, occurred_at desc);
