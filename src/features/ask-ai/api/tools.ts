import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMonthSummary,
  getDailySpend,
  searchTransactions,
  getTwelveMonthSeries,
} from "@/entities/transaction";
import { getMerchantLeaderboard } from "@/entities/merchant";
import { getCategories } from "@/entities/category";
import { CATEGORY_SLUGS, type CategorySlug } from "@/shared/config";
import { parseYm } from "@/shared/lib";

// ---------- Tool schemas (sent to Claude) ----------

export const TOOLS = [
  {
    name: "list_categories",
    description:
      "List all spending categories with their slug, name, emoji, and color. Use this first if you need to know what category slugs exist.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_monthly_summary",
    description:
      "Get a full summary of one month: total spent, transaction count, breakdown by category, top 5 merchants. Use 'current' for the current month or 'YYYY-MM'.",
    input_schema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month as 'YYYY-MM' or the string 'current'.",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "get_total",
    description:
      "Compute the sum and count of transactions matching filters. Use this to answer 'how much did I spend on X' questions.",
    input_schema: {
      type: "object",
      properties: {
        categorySlug: { type: "string", description: `One of: ${CATEGORY_SLUGS.join(", ")}` },
        merchantSubstring: { type: "string", description: "Case-insensitive substring of merchant name." },
        fromDate: { type: "string", description: "ISO date 'YYYY-MM-DD' inclusive." },
        toDate: { type: "string", description: "ISO date 'YYYY-MM-DD' inclusive." },
      },
      required: [],
    },
  },
  {
    name: "search_transactions",
    description:
      "Return individual transactions matching filters. Use this to surface specific transactions, not totals. Limit defaults to 20, max 100.",
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Merchant substring." },
        categorySlug: { type: "string" },
        fromDate: { type: "string" },
        toDate: { type: "string" },
        minAmount: { type: "number" },
        maxAmount: { type: "number" },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "get_top_merchants",
    description: "Return the top merchants by total spent (all-time). Limit defaults to 10.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      required: [],
    },
  },
  {
    name: "get_daily_spend",
    description: "Return daily total spend for the trailing N days.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number" } },
      required: ["days"],
    },
  },
  {
    name: "compare_periods",
    description:
      "Compare total spend (optionally for one category) between two date ranges. Returns totals and percentage change.",
    input_schema: {
      type: "object",
      properties: {
        periodA: {
          type: "object",
          properties: { from: { type: "string" }, to: { type: "string" } },
          required: ["from", "to"],
        },
        periodB: {
          type: "object",
          properties: { from: { type: "string" }, to: { type: "string" } },
          required: ["from", "to"],
        },
        categorySlug: { type: "string" },
      },
      required: ["periodA", "periodB"],
    },
  },
  {
    name: "get_twelve_month_trend",
    description:
      "Return total spend per month for the last 12 months. Use to answer trend / time-series questions.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
] as const;

// ---------- Tool handlers (run server-side) ----------

type Ctx = { supabase: SupabaseClient };

function isCategorySlug(s: unknown): s is CategorySlug {
  return typeof s === "string" && CATEGORY_SLUGS.includes(s as CategorySlug);
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: Ctx,
): Promise<unknown> {
  switch (name) {
    case "list_categories": {
      const cats = await getCategories(ctx.supabase);
      return cats.map((c) => ({ slug: c.slug, name: c.name, emoji: c.emoji }));
    }

    case "get_monthly_summary": {
      const m = String(input.month ?? "current");
      const month = m === "current" ? new Date() : parseYm(m);
      const s = await getMonthSummary(ctx.supabase, month);
      return {
        month: month.toISOString().slice(0, 7),
        total: s.total,
        prevTotal: s.prevTotal,
        transactionCount: s.txCount,
        breakdown: s.breakdown.map((b) => ({
          slug: b.slug,
          name: b.name,
          total: b.total,
          count: b.count,
        })),
        topMerchants: s.topMerchants.map((m) => ({
          name: m.name,
          total: m.total,
          count: m.count,
        })),
      };
    }

    case "get_total": {
      const slug = input.categorySlug;
      let categoryId: string | undefined;
      if (isCategorySlug(slug)) {
        const cats = await getCategories(ctx.supabase);
        categoryId = cats.find((c) => c.slug === slug)?.id;
      }
      const txs = await searchTransactions(ctx.supabase, {
        q: input.merchantSubstring as string | undefined,
        categoryId,
        from: input.fromDate as string | undefined,
        to: input.toDate as string | undefined,
      }, 5000);
      return {
        total: txs.reduce((a, t) => a + Number(t.amount_qar), 0),
        count: txs.length,
      };
    }

    case "search_transactions": {
      const slug = input.categorySlug;
      let categoryId: string | undefined;
      if (isCategorySlug(slug)) {
        const cats = await getCategories(ctx.supabase);
        categoryId = cats.find((c) => c.slug === slug)?.id;
      }
      const limit = Math.min(Number(input.limit ?? 20), 100);
      const txs = await searchTransactions(ctx.supabase, {
        q: input.q as string | undefined,
        categoryId,
        from: input.fromDate as string | undefined,
        to: input.toDate as string | undefined,
        minAmount: input.minAmount as number | undefined,
        maxAmount: input.maxAmount as number | undefined,
      }, limit);
      return txs.map((t) => ({
        id: t.id,
        date: t.occurred_at,
        amount: Number(t.amount_qar),
        merchant: t.merchant_raw,
        category: t.category?.slug ?? null,
      }));
    }

    case "get_top_merchants": {
      const limit = Math.min(Number(input.limit ?? 10), 50);
      const merchants = await getMerchantLeaderboard(ctx.supabase, limit);
      return merchants.map((m) => ({
        name: m.display_name,
        category: m.categories?.slug ?? null,
        total: Number(m.total_spent_qar),
        transactionCount: m.times_seen,
      }));
    }

    case "get_daily_spend": {
      const days = Math.min(Number(input.days ?? 30), 365);
      const series = await getDailySpend(ctx.supabase, days);
      return series;
    }

    case "compare_periods": {
      const slug = input.categorySlug;
      let categoryId: string | undefined;
      if (isCategorySlug(slug)) {
        const cats = await getCategories(ctx.supabase);
        categoryId = cats.find((c) => c.slug === slug)?.id;
      }
      const pa = input.periodA as { from: string; to: string };
      const pb = input.periodB as { from: string; to: string };
      const [a, b] = await Promise.all([
        searchTransactions(ctx.supabase, { categoryId, from: pa.from, to: pa.to }, 5000),
        searchTransactions(ctx.supabase, { categoryId, from: pb.from, to: pb.to }, 5000),
      ]);
      const aTotal = a.reduce((s, t) => s + Number(t.amount_qar), 0);
      const bTotal = b.reduce((s, t) => s + Number(t.amount_qar), 0);
      return {
        periodA: { ...pa, total: aTotal, count: a.length },
        periodB: { ...pb, total: bTotal, count: b.length },
        delta: aTotal - bTotal,
        pctChange: bTotal ? ((aTotal - bTotal) / bTotal) * 100 : null,
      };
    }

    case "get_twelve_month_trend": {
      const s = await getTwelveMonthSeries(ctx.supabase);
      return s.totalSeries;
    }

    default:
      return { error: `unknown_tool: ${name}` };
  }
}
