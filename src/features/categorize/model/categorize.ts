import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMerchant } from "@/shared/lib";
import { categorizeMerchantWithClaude } from "@/shared/api/anthropic";
import type { CategorizationSource, CategorySlug } from "@/shared/config";
import { applyKeywordRules } from "../lib/keyword-rules";

export type CategorizationResult = {
  slug: CategorySlug;
  confidence: number;
  reasoning: string;
  source: CategorizationSource;
};

type CategorizeContext = {
  supabase: SupabaseClient;
  userId: string;
};

/**
 * Resolve a merchant string to a category.
 *
 * Resolution order:
 *  1. Cache (merchants row).
 *  2. Keyword rule.
 *  3. Claude Haiku (if ANTHROPIC_API_KEY set, confidence ≥ 0.6).
 *  4. Fallback → "other".
 */
export async function categorize(
  merchantRaw: string,
  ctx: CategorizeContext,
): Promise<{
  result: CategorizationResult;
  normalized: string;
  merchantId: string | null;
}> {
  const normalized = normalizeMerchant(merchantRaw);

  // 1. Cache lookup
  const { data: cached } = await ctx.supabase
    .from("merchants")
    .select("id, category_id, source, confidence, reasoning, categories!inner(slug)")
    .eq("user_id", ctx.userId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (cached && cached.category_id && (cached as any).categories?.slug) {
    return {
      result: {
        slug: (cached as any).categories.slug as CategorySlug,
        confidence: Number(cached.confidence ?? 1),
        reasoning: cached.reasoning ?? "cache hit",
        source: "cache",
      },
      normalized,
      merchantId: cached.id,
    };
  }

  // 2. Keyword rule
  const ruleSlug = applyKeywordRules(normalized);
  if (ruleSlug) {
    const merchantId = await upsertMerchant(ctx, {
      normalized,
      displayName: merchantRaw,
      slug: ruleSlug,
      confidence: 0.9,
      source: "rule",
      reasoning: "keyword rule match",
    });
    return {
      result: { slug: ruleSlug, confidence: 0.9, reasoning: "keyword rule match", source: "rule" },
      normalized,
      merchantId,
    };
  }

  // 3. Claude
  const ai = await categorizeMerchantWithClaude(merchantRaw);
  if (ai && ai.confidence >= 0.6) {
    const merchantId = await upsertMerchant(ctx, {
      normalized,
      displayName: merchantRaw,
      slug: ai.slug,
      confidence: ai.confidence,
      source: "ai",
      reasoning: ai.reasoning,
    });
    return {
      result: { slug: ai.slug, confidence: ai.confidence, reasoning: ai.reasoning, source: "ai" },
      normalized,
      merchantId,
    };
  }

  // 4. Fallback
  const merchantId = await upsertMerchant(ctx, {
    normalized,
    displayName: merchantRaw,
    slug: "other",
    confidence: 0.2,
    source: "fallback",
    reasoning: ai ? `low-confidence AI (${ai.confidence.toFixed(2)})` : "no rule, no AI key",
  });
  return {
    result: { slug: "other", confidence: 0.2, reasoning: "uncategorized — review", source: "fallback" },
    normalized,
    merchantId,
  };
}

async function upsertMerchant(
  ctx: CategorizeContext,
  args: {
    normalized: string;
    displayName: string;
    slug: CategorySlug;
    confidence: number;
    source: CategorizationSource;
    reasoning: string;
  },
): Promise<string | null> {
  const { data: cat } = await ctx.supabase
    .from("categories")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("slug", args.slug)
    .single();
  if (!cat) return null;

  const { data: inserted, error } = await ctx.supabase
    .from("merchants")
    .upsert(
      {
        user_id: ctx.userId,
        normalized_name: args.normalized,
        display_name: args.displayName,
        category_id: cat.id,
        confidence: args.confidence,
        source: args.source,
        reasoning: args.reasoning,
      },
      { onConflict: "user_id,normalized_name" },
    )
    .select("id")
    .single();
  if (error) {
    console.error("[categorize] merchant upsert failed", error);
    return null;
  }
  return inserted?.id ?? null;
}
