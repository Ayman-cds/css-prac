import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchantWithCategory } from "../model/types";

export async function getMerchants(supabase: SupabaseClient): Promise<MerchantWithCategory[]> {
  const { data } = await supabase
    .from("merchants")
    .select(
      "id, normalized_name, display_name, category_id, confidence, source, times_seen, total_spent_qar, first_seen, last_seen_at, categories(slug, name, emoji, color)",
    )
    .order("times_seen", { ascending: false });
  return (data ?? []) as unknown as MerchantWithCategory[];
}

export async function getMerchantLeaderboard(
  supabase: SupabaseClient,
  limit = 10,
): Promise<MerchantWithCategory[]> {
  const { data } = await supabase
    .from("merchants")
    .select(
      "id, normalized_name, display_name, category_id, confidence, source, times_seen, total_spent_qar, first_seen, last_seen_at, categories(slug, name, emoji, color)",
    )
    .order("total_spent_qar", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as MerchantWithCategory[];
}
