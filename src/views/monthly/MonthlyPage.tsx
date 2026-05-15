import { createSupabaseServerClient } from "@/shared/api/supabase";
import { parseYm, lastNDays, dayList, monthRange } from "@/shared/lib";
import { getMonthSummary, getTransactionsInRange } from "@/entities/transaction";
import { MonthSelector } from "@/features/month-navigation";
import { CategoryBreakdownCard } from "@/widgets/category-breakdown";
import { Card, CardGrid } from "@/shared/ui/card";
import { Amount, DeltaPill } from "@/shared/ui/amount";
import { DailyBars } from "@/shared/ui/charts";
import { pctChange, formatQar } from "@/shared/lib";

export async function MonthlyPage({ ym }: { ym?: string }) {
  const supabase = createSupabaseServerClient();
  const month = parseYm(ym);
  const summary = await getMonthSummary(supabase, month);

  // daily bars for the selected month
  const { start, end } = monthRange(month);
  const txs = await getTransactionsInRange(supabase, start, end);
  const dayMap = new Map<string, number>();
  for (const t of txs) {
    const k = t.occurred_at.slice(0, 10);
    dayMap.set(k, (dayMap.get(k) ?? 0) + Number(t.amount_qar));
  }
  const days = dayList(start, end).map((d) => ({
    label: d.label,
    total: dayMap.get(d.key) ?? 0,
  }));

  const delta = pctChange(summary.total, summary.prevTotal);
  const label = month.toLocaleString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.10em] text-ink-dim">
            {label}
          </div>
          <div className="mt-1">
            <Amount amount={summary.total} size="xl" />
          </div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-muted">
            <DeltaPill pct={delta} />
            <span>vs last month</span>
          </div>
        </div>
        <MonthSelector />
      </div>

      <CardGrid className="md:grid-cols-2">
        <CategoryBreakdownCard breakdown={summary.breakdown} total={summary.total} hint={label} />
        <Card title="Day by day" hint={label}>
          <DailyBars data={days} />
        </Card>
      </CardGrid>

      <Card title="Top merchants" hint={label}>
        {summary.topMerchants.length === 0 ? (
          <div className="text-[13px] text-ink-muted">No spending this month yet.</div>
        ) : (
          <ul className="-mx-3 divide-y divide-line/40">
            {summary.topMerchants.map((m) => (
              <li key={m.name} className="flex items-center justify-between rounded-xl px-3 py-3">
                <div>
                  <div className="text-[14px] font-medium text-ink">{m.name}</div>
                  <div className="text-[12px] text-ink-muted">{m.count} transactions</div>
                </div>
                <div className="tabular text-[14px] font-medium text-ink">
                  {formatQar(m.total)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
