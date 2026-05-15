import { subDays } from "date-fns";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { lastNDays, monthRange } from "@/shared/lib";
import {
  getRecentTransactions,
  getMonthSummary,
  getDailySpend,
  getTransactionsInRange,
} from "@/entities/transaction";
import { getBudgets } from "@/entities/budget";
import { detectAnomalies } from "@/features/anomaly-detection";
import { MonthSummaryHero } from "@/widgets/month-summary-hero";
import { AnomalyBanner } from "@/widgets/anomaly-banner";
import { CategoryBreakdownCard } from "@/widgets/category-breakdown";
import { DailyTrendCard } from "@/widgets/daily-trend";
import { BudgetListCard } from "@/widgets/budget-list";
import type { BudgetWithSpent } from "@/widgets/budget-list";
import { RecentTransactionsCard } from "@/widgets/recent-transactions";
import { CardGrid } from "@/shared/ui/card";
import { InsightsStrip } from "@/widgets/insights-strip";
import { getOrGenerateInsights } from "@/features/auto-insights";

export async function OverviewPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const now = new Date();
  const monthLabel = monthRange(now).start.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const [summary, recent, dailyTrend, budgets, insights] = await Promise.all([
    getMonthSummary(supabase, now),
    getRecentTransactions(supabase, 12),
    getDailySpend(supabase, 30),
    getBudgets(supabase),
    user ? getOrGenerateInsights(supabase, user.id) : Promise.resolve([]),
  ]);

  // Anomalies: recent (30d) vs prior 90d.
  const recentRange = lastNDays(30, now);
  const historicalStart = subDays(recentRange.start, 90);
  const historicalEnd = subDays(recentRange.start, 1);
  const [recentTx, histTx] = await Promise.all([
    getTransactionsInRange(supabase, recentRange.start, recentRange.end),
    getTransactionsInRange(supabase, historicalStart, historicalEnd),
  ]);
  const enrichRecent = recentTx.map((t) => ({ ...t, category_slug: t.category?.slug ?? null }));
  const enrichHist = histTx.map((t) => ({ ...t, category_slug: t.category?.slug ?? null }));
  const anomalies = detectAnomalies(enrichRecent, enrichHist);

  const budgetsWithSpent: BudgetWithSpent[] = budgets.map((b) => {
    const spent = summary.transactions
      .filter((t) => t.category_id === b.category_id)
      .reduce((a, t) => a + Number(t.amount_qar), 0);
    return {
      id: b.id,
      monthly_limit: Number(b.monthly_limit),
      spent,
      categories: b.categories,
    };
  });

  return (
    <div className="space-y-6">
      <MonthSummaryHero
        monthLabel={monthLabel}
        total={summary.total}
        prevTotal={summary.prevTotal}
        txCount={summary.txCount}
      />

      <InsightsStrip insights={insights} />

      <AnomalyBanner anomalies={anomalies} />

      <CardGrid className="md:grid-cols-2">
        <CategoryBreakdownCard breakdown={summary.breakdown} total={summary.total} />
        <DailyTrendCard data={dailyTrend} />
      </CardGrid>

      <BudgetListCard budgets={budgetsWithSpent} monthLabel={monthLabel} />

      <RecentTransactionsCard transactions={recent} />
    </div>
  );
}
