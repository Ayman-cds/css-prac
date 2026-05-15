import type { SupabaseClient } from "@supabase/supabase-js";
import { categorizeMerchantWithClaude } from "@/shared/api/anthropic";
import type { CategorySlug } from "@/shared/config";

export type ReanalyzeScope = "low-confidence" | "all-except-corrected" | "everything";

export type MerchantToProcess = {
  id: string;
  normalized_name: string;
  display_name: string;
  current_category_id: string | null;
  current_category_slug: CategorySlug | null;
};

export type ReanalyzeProgress = {
  done: number;
  total: number;
  merchant: string;
  newCategory: CategorySlug | null;
  changed: boolean;
};

export type ReanalyzeDone = {
  merchantsProcessed: number;
  transactionsUpdated: number;
  changedCategory: number;
};

/**
 * Fetch the set of merchants in scope for re-analysis.
 */
export async function fetchMerchantsForScope(
  supabase: SupabaseClient,
  userId: string,
  scope: ReanalyzeScope,
): Promise<MerchantToProcess[]> {
  let q = supabase
    .from("merchants")
    .select(
      "id, normalized_name, display_name, category_id, categories(slug)",
    )
    .eq("user_id", userId);

  if (scope === "low-confidence") {
    q = q.or("confidence.lt.0.8,source.eq.fallback");
  }

  const { data: merchants, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (merchants ?? []) as unknown as Array<{
    id: string;
    normalized_name: string;
    display_name: string;
    category_id: string | null;
    categories: { slug: CategorySlug } | null;
  }>;

  if (scope === "everything") {
    return rows.map((r) => ({
      id: r.id,
      normalized_name: r.normalized_name,
      display_name: r.display_name,
      current_category_id: r.category_id,
      current_category_slug: r.categories?.slug ?? null,
    }));
  }

  // For "low-confidence" and "all-except-corrected", skip merchants where
  // every linked transaction is user_corrected = true.
  const merchantIds = rows.map((r) => r.id);
  if (merchantIds.length === 0) return [];

  const { data: txs } = await supabase
    .from("transactions")
    .select("merchant_id, user_corrected")
    .eq("user_id", userId)
    .in("merchant_id", merchantIds);

  // group corrections per merchant
  const total = new Map<string, number>();
  const corrected = new Map<string, number>();
  for (const t of txs ?? []) {
    const mid = (t as { merchant_id: string | null }).merchant_id;
    if (!mid) continue;
    total.set(mid, (total.get(mid) ?? 0) + 1);
    if ((t as { user_corrected: boolean }).user_corrected) {
      corrected.set(mid, (corrected.get(mid) ?? 0) + 1);
    }
  }

  return rows
    .filter((r) => {
      const tot = total.get(r.id) ?? 0;
      const corr = corrected.get(r.id) ?? 0;
      // skip if every linked transaction is user-corrected
      return tot === 0 || corr < tot;
    })
    .map((r) => ({
      id: r.id,
      normalized_name: r.normalized_name,
      display_name: r.display_name,
      current_category_id: r.category_id,
      current_category_slug: r.categories?.slug ?? null,
    }));
}

/**
 * Reclassify one merchant via Claude; persist changes to merchant + linked
 * transactions (excluding user_corrected ones).
 *
 * Returns the new category slug and whether it differs from the previous one.
 */
export async function reanalyzeMerchant(
  supabase: SupabaseClient,
  userId: string,
  merchant: MerchantToProcess,
): Promise<{ newSlug: CategorySlug | null; changed: boolean; transactionsUpdated: number }> {
  const ai = await categorizeMerchantWithClaude(merchant.display_name);
  if (!ai || ai.confidence < 0.6) {
    // leave as-is on low confidence — don't downgrade a previous decision
    return { newSlug: merchant.current_category_slug, changed: false, transactionsUpdated: 0 };
  }

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", ai.slug)
    .single();
  if (!cat) {
    return { newSlug: merchant.current_category_slug, changed: false, transactionsUpdated: 0 };
  }

  const changed = ai.slug !== merchant.current_category_slug;

  await supabase
    .from("merchants")
    .update({
      category_id: cat.id,
      confidence: ai.confidence,
      source: "ai",
      reasoning: ai.reasoning,
    })
    .eq("id", merchant.id)
    .eq("user_id", userId);

  let transactionsUpdated = 0;
  if (changed) {
    const { data: updated } = await supabase
      .from("transactions")
      .update({ category_id: cat.id, category_confidence: ai.confidence })
      .eq("user_id", userId)
      .eq("merchant_id", merchant.id)
      .eq("user_corrected", false)
      .select("id");
    transactionsUpdated = updated?.length ?? 0;
  }

  return { newSlug: ai.slug, changed, transactionsUpdated };
}
