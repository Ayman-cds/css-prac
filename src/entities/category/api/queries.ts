import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "../model/types";

export async function getCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, emoji, color, is_system, sort_order, budget_qar")
    .order("sort_order");
  return (data ?? []) as Category[];
}
