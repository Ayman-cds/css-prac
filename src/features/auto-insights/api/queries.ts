import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInsights, type Insight } from "../model/generate";

/**
 * Fetch today's cached insights for the signed-in user, or generate + cache
 * if missing. Returns [] on any error so the UI degrades gracefully.
 */
export async function getOrGenerateInsights(
  supabase: SupabaseClient,
  userId: string,
): Promise<Insight[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: cached } = await supabase
    .from("insights")
    .select("content")
    .eq("user_id", userId)
    .eq("day_key", today)
    .maybeSingle();

  if (cached && Array.isArray(cached.content)) {
    return cached.content as Insight[];
  }

  const insights = await generateInsights(supabase);
  if (insights.length === 0) return [];

  await supabase.from("insights").upsert(
    {
      user_id: userId,
      day_key: today,
      content: insights,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day_key" },
  );
  return insights;
}
