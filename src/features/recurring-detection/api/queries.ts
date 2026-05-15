import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriptionWithMerchant } from "@/entities/subscription";

export async function getSubscriptions(
  supabase: SupabaseClient,
): Promise<SubscriptionWithMerchant[]> {
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, merchant_id, cadence, expected_amount_qar, confidence, next_expected_date, active, detected_at, merchants(display_name, normalized_name, categories(slug, name, emoji, color))",
    )
    .eq("active", true)
    .order("expected_amount_qar", { ascending: false });
  return (data ?? []) as unknown as SubscriptionWithMerchant[];
}
