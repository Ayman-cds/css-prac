import { subDays } from "date-fns";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import {
  getTwelveMonthSeries,
  getTransactionsInRange,
} from "@/entities/transaction";
import { getMerchantLeaderboard } from "@/entities/merchant";
import { detectAnomalies } from "@/features/anomaly-detection";
import { AnomalyBanner } from "@/widgets/anomaly-banner";
import { Card, CardGrid } from "@/shared/ui/card";
import { TrendLine, StackedArea } from "@/shared/ui/charts";
import { formatQar, lastNDays } from "@/shared/lib";

const SLUG_LABEL: Record<string, string> = {
  dining: "Food & Dining",
  "food-delivery": "Food Delivery",
  groceries: "Groceries",
  transport: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  health: "Health",
  bills: "Bills",
  travel: "Travel",
  cash: "Cash",
  other: "Other",
};

export async function TrendsPage() {
  const supabase = createSupabaseServerClient();

  const [series, leaderboard] = await Promise.all([
    getTwelveMonthSeries(supabase),
    getMerchantLeaderboard(supabase, 10),
  ]);

  // anomalies
  const now = new Date();
  const recentRange = lastNDays(30, now);
  const historicalStart = subDays(recentRange.start, 90);
  const historicalEnd = subDays(recentRange.start, 1);
  const [recentTx, histTx] = await Promise.all([
    getTransactionsInRange(supabase, recentRange.start, recentRange.end),
    getTransactionsInRange(supabase, historicalStart, historicalEnd),
  ]);
  const er = recentTx.map((t) => ({ ...t, category_slug: t.category?.slug ?? null }));
  const eh = histTx.map((t) => ({ ...t, category_slug: t.category?.slug ?? null }));
  const anomalies = detectAnomalies(er, eh);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold tracking-display text-ink">
          Trends
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          12 months of spending patterns and outliers.
        </p>
      </header>

      <AnomalyBanner anomalies={anomalies} />

      <Card title="Total spending" hint="last 12 months">
        <TrendLine data={series.totalSeries.map((s) => ({ label: s.label, total: s.total }))} />
      </Card>

      <Card title="By category" hint="last 12 months">
        <StackedArea
          data={series.stackedSeries}
          keys={series.categories}
          keyLabels={SLUG_LABEL}
        />
      </Card>

      <Card title="Top merchants" hint="all time">
        {leaderboard.length === 0 ? (
          <div className="text-[13px] text-ink-muted">No merchants yet.</div>
        ) : (
          <ul className="-mx-3 divide-y divide-line/40">
            {leaderboard.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl px-3 py-3"
              >
                <div>
                  <div className="text-[14px] font-medium text-ink">{m.display_name}</div>
                  <div className="text-[12px] text-ink-muted">
                    {m.times_seen} transactions · {m.categories?.name ?? "—"}
                  </div>
                </div>
                <div className="tabular text-[14px] font-medium text-ink">
                  {formatQar(Number(m.total_spent_qar))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
