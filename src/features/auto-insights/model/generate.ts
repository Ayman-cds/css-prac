import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, HAIKU_MODEL } from "@/shared/api/anthropic";
import {
  getMonthSummary,
  getDailySpend,
  getTransactionsInRange,
} from "@/entities/transaction";
import { lastNDays, monthRange, prevMonth, pctChange } from "@/shared/lib";

export type Insight = {
  headline: string;
  detail: string;
  tone: "neutral" | "up" | "down" | "warning";
};

type Snapshot = {
  today: string;
  currentMonth: {
    label: string;
    total: number;
    prevTotal: number;
    pctChange: number | null;
    txCount: number;
    topCategories: Array<{ name: string; total: number; pctOfMonth: number; deltaPct: number | null }>;
    topMerchants: Array<{ name: string; total: number; count: number }>;
  };
  rolling: {
    last7Total: number;
    prior7Total: number;
    last7PctChange: number | null;
    last30DailyAvg: number;
  };
};

export async function buildSnapshot(
  supabase: SupabaseClient,
): Promise<Snapshot> {
  const now = new Date();
  const monthLabel = monthRange(now).start.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const summary = await getMonthSummary(supabase, now);
  const prevSummary = await getMonthSummary(supabase, prevMonth(now));

  // per-category deltas
  const prevByCat = new Map(prevSummary.breakdown.map((b) => [b.slug, b.total]));
  const topCategories = summary.breakdown.slice(0, 5).map((b) => ({
    name: b.name,
    total: b.total,
    pctOfMonth: summary.total ? (b.total / summary.total) * 100 : 0,
    deltaPct: pctChange(b.total, prevByCat.get(b.slug) ?? 0),
  }));

  const dailyTrend = await getDailySpend(supabase, 30);
  const last7Total = dailyTrend.slice(-7).reduce((s, d) => s + d.total, 0);
  const prior7Total = dailyTrend.slice(-14, -7).reduce((s, d) => s + d.total, 0);
  const last30DailyAvg = dailyTrend.length
    ? dailyTrend.reduce((s, d) => s + d.total, 0) / dailyTrend.length
    : 0;

  return {
    today: now.toISOString().slice(0, 10),
    currentMonth: {
      label: monthLabel,
      total: summary.total,
      prevTotal: summary.prevTotal,
      pctChange: pctChange(summary.total, summary.prevTotal),
      txCount: summary.txCount,
      topCategories,
      topMerchants: summary.topMerchants.map((m) => ({
        name: m.name,
        total: m.total,
        count: m.count,
      })),
    },
    rolling: {
      last7Total,
      prior7Total,
      last7PctChange: pctChange(last7Total, prior7Total),
      last30DailyAvg,
    },
  };
}

const SYSTEM_PROMPT = `You generate 2 to 3 short, useful observations about a user's QNB credit-card spending this month. All amounts are QAR.

Rules:
- Output STRICT JSON only: an array of objects { "headline": string, "detail": string, "tone": "neutral"|"up"|"down"|"warning" }.
- 2 or 3 items.
- headline ≤ 60 chars. detail ≤ 120 chars. Lead with a concrete number.
- tone: "down" for positive saving signals, "up" for higher spending, "warning" only for clearly concerning patterns.
- Skip categories with zero spend. Don't repeat the same idea.
- If data is too sparse to say anything meaningful, return a single insight with tone "neutral" acknowledging this.`;

export async function generateInsights(
  supabase: SupabaseClient,
): Promise<Insight[]> {
  const client = getAnthropic();
  if (!client) return [];

  const snapshot = await buildSnapshot(supabase);
  if (snapshot.currentMonth.txCount === 0 && snapshot.rolling.last7Total === 0) {
    return [
      {
        headline: "No spending recorded yet",
        detail: "Once your iOS Shortcut posts a few transactions, insights will appear here.",
        tone: "neutral",
      },
    ];
  }

  try {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 400,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nReturn the JSON array now.`,
        },
      ],
    });
    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return [];
    const match = block.text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Insight =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as { headline: unknown }).headline === "string" &&
          typeof (x as { detail: unknown }).detail === "string",
      )
      .map((x) => ({
        headline: x.headline,
        detail: x.detail,
        tone: (["up", "down", "warning", "neutral"] as const).includes(
          x.tone as "up" | "down" | "warning" | "neutral",
        )
          ? x.tone
          : "neutral",
      }))
      .slice(0, 3);
  } catch (err) {
    console.error("[insights] generation failed", err);
    return [];
  }
}
