import type { SupabaseClient } from "@supabase/supabase-js";
import type { Budget } from "../model/types";

export async function getBudgets(supabase: SupabaseClient): Promise<Budget[]> {
  const { data } = await supabase
    .from("budgets")
    .select("id, category_id, monthly_limit, categories(slug, name, emoji, color)");
  return (data ?? []) as unknown as Budget[];
}
