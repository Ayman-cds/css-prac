import type { SupabaseClient } from "@supabase/supabase-js";

export type MergeResult = {
  transactionsMoved: number;
  targetTotalSpent: number;
  targetTimesSeen: number;
};

/**
 * Merge `sourceMerchantId` into `targetMerchantId`:
 *   1. Re-point all transactions that were pointing at the source.
 *   2. Recompute the target's aggregate stats from the resulting set.
 *   3. Delete the source merchant row.
 *
 * Both merchants must belong to the user (RLS enforces this). The target
 * keeps its existing display_name, category, and source — only its stats
 * are updated.
 */
export async function mergeMerchants(
  supabase: SupabaseClient,
  userId: string,
  sourceMerchantId: string,
  targetMerchantId: string,
): Promise<MergeResult> {
  if (sourceMerchantId === targetMerchantId) {
    throw new Error("source and target must differ");
  }

  // Sanity: both rows exist + belong to user.
  const { data: pair } = await supabase
    .from("merchants")
    .select("id, normalized_name, display_name")
    .eq("user_id", userId)
    .in("id", [sourceMerchantId, targetMerchantId]);
  if (!pair || pair.length !== 2) {
    throw new Error("merchant_not_found");
  }
  const target = pair.find((m) => m.id === targetMerchantId);
  if (!target) throw new Error("merchant_not_found");

  // 1. Re-point transactions. Also rewrite merchant_normalized so future
  //    cache lookups for those rows hit the target's normalized name.
  const { data: moved } = await supabase
    .from("transactions")
    .update({
      merchant_id: targetMerchantId,
      merchant_normalized: target.normalized_name,
    })
    .eq("user_id", userId)
    .eq("merchant_id", sourceMerchantId)
    .select("id");
  const transactionsMoved = moved?.length ?? 0;

  // 2. Recompute target aggregates from the FULL transaction set now linked
  //    to it. Avoids drift from double-counting if anything was added
  //    between the move and the recompute.
  const { data: allTxs } = await supabase
    .from("transactions")
    .select("amount_qar, occurred_at")
    .eq("user_id", userId)
    .eq("merchant_id", targetMerchantId);

  const rows = (allTxs ?? []) as Array<{ amount_qar: number; occurred_at: string }>;
  const total = rows.reduce((s, t) => s + Number(t.amount_qar), 0);
  const count = rows.length;
  const lastSeenAt = rows
    .map((r) => r.occurred_at)
    .sort()
    .pop();

  await supabase
    .from("merchants")
    .update({
      total_spent_qar: total,
      times_seen: count,
      last_seen_at: lastSeenAt ?? new Date().toISOString(),
    })
    .eq("id", targetMerchantId)
    .eq("user_id", userId);

  // 3. Delete the source merchant row.
  await supabase
    .from("merchants")
    .delete()
    .eq("id", sourceMerchantId)
    .eq("user_id", userId);

  return {
    transactionsMoved,
    targetTotalSpent: total,
    targetTimesSeen: count,
  };
}
