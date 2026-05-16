import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TransactionWithCategory,
} from "@/entities/transaction";
import type { SmartCategoryFilter } from "@/entities/smart-category";

const TX_SELECT_BASE =
  "id, occurred_at, card_last_digit, amount_qar, is_approximate, merchant_raw, merchant_normalized, merchant_id, category_id, category_confidence, balance_qar, raw_sms, notes, user_corrected, created_at, categories(slug, name, emoji, color)";
const TX_SELECT_FULL = TX_SELECT_BASE.replace("user_corrected,", "user_corrected, hidden,");

let _hasHiddenColumn: boolean | null = null;
async function hasHiddenColumn(supabase: SupabaseClient): Promise<boolean> {
  if (_hasHiddenColumn !== null) return _hasHiddenColumn;
  const { error } = await supabase
    .from("transactions")
    .select("hidden", { count: "exact", head: true });
  _hasHiddenColumn = !(error && (error.code === "42703" || /hidden/i.test(error.message ?? "")));
  return _hasHiddenColumn;
}

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
  hidden?: boolean;
  created_at: string;
  categories: { slug: string; name: string; emoji: string; color: string } | null;
};

function mapTx(rows: Row[]): TransactionWithCategory[] {
  return rows.map((r) => ({
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
    category: r.categories as TransactionWithCategory["category"],
  }));
}

/**
 * Evaluate a smart-category filter against the user's transactions.
 *
 * Most predicates run as SQL filters. dayOfWeek and exclusions of
 * subscription merchants apply as a post-filter in JS.
 */
export async function evaluateSmartCategoryFilter(
  supabase: SupabaseClient,
  userId: string,
  filter: SmartCategoryFilter,
  limit = 1000,
): Promise<TransactionWithCategory[]> {
  const supports = await hasHiddenColumn(supabase);
  let q = supabase
    .from("transactions")
    .select(supports ? TX_SELECT_FULL : TX_SELECT_BASE)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (supports) q = q.eq("hidden", false);

  if (filter.fromDate) q = q.gte("occurred_at", filter.fromDate);
  if (filter.toDate) q = q.lte("occurred_at", filter.toDate);
  if (typeof filter.amountMin === "number") q = q.gte("amount_qar", filter.amountMin);
  if (typeof filter.amountMax === "number") q = q.lte("amount_qar", filter.amountMax);

  // merchantPatterns → OR of ilike clauses on merchant_raw
  if (filter.merchantPatterns && filter.merchantPatterns.length > 0) {
    const clause = filter.merchantPatterns
      .map((p) => `merchant_raw.ilike.%${p.replace(/,/g, "")}%`)
      .join(",");
    q = q.or(clause);
  }

  if (filter.merchantIds && filter.merchantIds.length > 0) {
    q = q.in("merchant_id", filter.merchantIds);
  }

  if (filter.categorySlugs && filter.categorySlugs.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, slug")
      .eq("user_id", userId)
      .in("slug", filter.categorySlugs);
    const ids = (cats ?? []).map((c) => c.id);
    if (ids.length === 0) return [];
    q = q.in("category_id", ids);
  }

  if (filter.excludeCategorySlugs && filter.excludeCategorySlugs.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, slug")
      .eq("user_id", userId)
      .in("slug", filter.excludeCategorySlugs);
    const ids = (cats ?? []).map((c) => c.id);
    for (const id of ids) q = q.neq("category_id", id);
  }

  // subscription-linked merchants
  let subscriptionMerchantIds: Set<string> | null = null;
  if (filter.onlySubscriptions || filter.excludeSubscriptions) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("merchant_id")
      .eq("user_id", userId)
      .eq("active", true);
    subscriptionMerchantIds = new Set((subs ?? []).map((s) => s.merchant_id));
    if (filter.onlySubscriptions) {
      const ids = [...subscriptionMerchantIds];
      if (ids.length === 0) return [];
      q = q.in("merchant_id", ids);
    }
  }

  const { data } = await q;
  let rows = mapTx((data ?? []) as unknown as Row[]);

  if (filter.dayOfWeek && filter.dayOfWeek.length > 0) {
    const days = new Set(filter.dayOfWeek);
    rows = rows.filter((t) => days.has(new Date(t.occurred_at).getDay()));
  }

  if (filter.excludeSubscriptions && subscriptionMerchantIds) {
    rows = rows.filter(
      (t) => !t.merchant_id || !subscriptionMerchantIds!.has(t.merchant_id),
    );
  }

  return rows;
}
