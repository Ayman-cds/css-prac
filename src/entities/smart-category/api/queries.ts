import type { SupabaseClient } from "@supabase/supabase-js";
import type { SmartCategory } from "../model/types";

export async function listSmartCategories(
  supabase: SupabaseClient,
): Promise<SmartCategory[]> {
  const { data } = await supabase
    .from("smart_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as SmartCategory[];
}

export async function getSmartCategory(
  supabase: SupabaseClient,
  id: string,
): Promise<SmartCategory | null> {
  const { data } = await supabase
    .from("smart_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as SmartCategory) ?? null;
}
