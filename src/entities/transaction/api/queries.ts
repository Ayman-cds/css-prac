import type { SupabaseClient } from "@supabase/supabase-js";
import { monthRange, lastNDays, last12Months, dayList, prevMonth } from "@/shared/lib";
import type { CategorySlug } from "@/shared/config";
import type { TransactionWithCategory } from "../model/types";

type Row = {
  id: string;
  occurred_at: string;
  card_last_digit: string | null;
  amount_qar: number;
  is_approximate: boolean;
  merchant_raw: string;
  merchant_normalized: string;
  merchant_id: string | null;
  category_id: string | null;
  category_confidence: number | null;
  balance_qar: number | null;
  raw_sms: string;
  notes: string | null;
  user_corrected: boolean;
  hidden: boolean;
  created_at: string;
  categories: { slug: CategorySlug; name: string; emoji: string; color: string } | null;
};

const TX_SELECT =
  "id, occurred_at, card_last_digit, amount_qar, is_approximate, merchant_raw, merchant_normalized, merchant_id, category_id, category_confidence, balance_qar, raw_sms, notes, user_corrected, hidden, created_at, categories(slug, name, emoji, color)";

function mapTx(rows: Row[] | null): TransactionWithCategory[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    occurred_at: r.occurred_at,
    card_last_digit: r.card_last_digit,
    amount_qar: Number(r.amount_qar),
    is_approximate: r.is_approximate,
    merchant_raw: r.merchant_raw,
    merchant_normalized: r.merchant_normalized,
    merchant_id: r.merchant_id,
    category_id: r.category_id,
    category_confidence:
      r.category_confidence == null ? null : Number(r.category_confidence),
    balance_qar: r.balance_qar == null ? null : Number(r.balance_qar),
    raw_sms: r.raw_sms,
    notes: r.notes,
    user_corrected: r.user_corrected,
    hidden: Boolean(r.hidden),
    created_at: r.created_at,
    category: r.categories,
  }));
}

/**
 * Single-transaction lookup. Does NOT filter `hidden` — the detail page
 * needs to be reachable so the user can un-hide.
 */
export async function getTransactionById(
  supabase: SupabaseClient,
  id: string,
): Promise<TransactionWithCategory | null> {
  const { data } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return mapTx([data as unknown as Row])[0] ?? null;
}

export async function getRecentTransactions(
  supabase: SupabaseClient,
  limit = 20,
): Promise<TransactionWithCategory[]> {
  const { data } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("hidden", false)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return mapTx(data as unknown as Row[]);
}

export async function getTransactionsInRange(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<TransactionWithCategory[]> {
  const { data } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("hidden", false)
    .gte("occurred_at", start.toISOString())
    .lte("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false });
  return mapTx(data as unknown as Row[]);
}

export async function getTransactionsByMerchant(
  supabase: SupabaseClient,
  merchantId: string,
  excludeId?: string,
  limit = 10,
): Promise<TransactionWithCategory[]> {
  let q = supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("merchant_id", merchantId)
    .eq("hidden", false)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return mapTx(data as unknown as Row[]);
}

export async function getMonthSummary(supabase: SupabaseClient, month: Date) {
  const { start, end } = monthRange(month);
  const txs = await getTransactionsInRange(supabase, start, end);
  const prev = monthRange(prevMonth(month));
  const prevTxs = await getTransactionsInRange(supabase, prev.start, prev.end);

  const total = txs.reduce((a, b) => a + Number(b.amount_qar), 0);
  const prevTotal = prevTxs.reduce((a, b) => a + Number(b.amount_qar), 0);

  const byCat = new Map<
    string,
    { slug: CategorySlug; name: string; emoji: string; color: string; total: number; count: number }
  >();
  for (const t of txs) {
    if (!t.category) continue;
    const key = t.category.slug;
    const cur = byCat.get(key) ?? { ...t.category, total: 0, count: 0 };
    cur.total += Number(t.amount_qar);
    cur.count += 1;
    byCat.set(key, cur);
  }
  const breakdown = [...byCat.values()].sort((a, b) => b.total - a.total);

  const byMerchant = new Map<string, { name: string; total: number; count: number }>();
  for (const t of txs) {
    const k = t.merchant_normalized || t.merchant_raw;
    const cur = byMerchant.get(k) ?? { name: t.merchant_raw, total: 0, count: 0 };
    cur.total += Number(t.amount_qar);
    cur.count += 1;
    byMerchant.set(k, cur);
  }
  const topMerchants = [...byMerchant.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  return {
    transactions: txs,
    total,
    prevTotal,
    breakdown,
    topMerchants,
    txCount: txs.length,
  };
}

export async function getDailySpend(
  supabase: SupabaseClient,
  days: number,
): Promise<{ date: string; label: string; total: number }[]> {
  const { start, end } = lastNDays(days);
  const txs = await getTransactionsInRange(supabase, start, end);
  const list = dayList(start, end);
  const map = new Map<string, number>();
  for (const t of txs) {
    const key = t.occurred_at.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + Number(t.amount_qar));
  }
  return list.map((d) => ({ date: d.key, label: d.label, total: map.get(d.key) ?? 0 }));
}

export async function getTwelveMonthSeries(supabase: SupabaseClient) {
  const months = last12Months();
  const start = months[0].start;
  const end = months[months.length - 1].end;
  const txs = await getTransactionsInRange(supabase, start, end);

  const totals = new Map<string, number>();
  const stacks = new Map<string, Map<CategorySlug, number>>();
  for (const t of txs) {
    const k = t.occurred_at.slice(0, 7);
    totals.set(k, (totals.get(k) ?? 0) + Number(t.amount_qar));
    if (t.category) {
      const inner = stacks.get(k) ?? new Map();
      inner.set(t.category.slug, (inner.get(t.category.slug) ?? 0) + Number(t.amount_qar));
      stacks.set(k, inner);
    }
  }

  const totalSeries = months.map((m) => ({
    key: m.key,
    label: m.label,
    total: totals.get(m.key) ?? 0,
  }));

  const allSlugs = new Set<CategorySlug>();
  for (const inner of stacks.values()) for (const s of inner.keys()) allSlugs.add(s);

  const stackedSeries = months.map((m) => {
    const inner = stacks.get(m.key);
    const row: Record<string, number | string> = { key: m.key, label: m.label };
    for (const s of allSlugs) row[s] = inner?.get(s) ?? 0;
    return row;
  });

  return { totalSeries, stackedSeries, categories: [...allSlugs] };
}

export type SearchFilters = {
  q?: string;
  categoryId?: string;
  card?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  /** When true, returns hidden transactions instead of visible ones. */
  onlyHidden?: boolean;
  /** When true, returns hidden + visible together. */
  includeHidden?: boolean;
};

export async function searchTransactions(
  supabase: SupabaseClient,
  f: SearchFilters,
  limit = 200,
): Promise<TransactionWithCategory[]> {
  let q = supabase
    .from("transactions")
    .select(TX_SELECT)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (f.onlyHidden) q = q.eq("hidden", true);
  else if (!f.includeHidden) q = q.eq("hidden", false);
  if (f.q) q = q.ilike("merchant_raw", `%${f.q}%`);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.card) q = q.eq("card_last_digit", f.card);
  if (f.from) q = q.gte("occurred_at", f.from);
  if (f.to) q = q.lte("occurred_at", f.to);
  if (f.minAmount != null) q = q.gte("amount_qar", f.minAmount);
  if (f.maxAmount != null) q = q.lte("amount_qar", f.maxAmount);
  const { data } = await q;
  return mapTx(data as unknown as Row[]);
}
