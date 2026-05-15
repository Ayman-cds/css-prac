import { Amount, DeltaPill } from "@/shared/ui/amount";
import { pctChange } from "@/shared/lib";

export function MonthSummaryHero({
  monthLabel,
  total,
  prevTotal,
  txCount,
}: {
  monthLabel: string;
  total: number;
  prevTotal: number;
  txCount: number;
}) {
  const delta = pctChange(total, prevTotal);
  return (
    <header className="px-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.10em] text-ink-dim">
        {monthLabel}
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Amount amount={total} size="hero" />
          <div className="mt-2 flex items-center gap-2">
            <DeltaPill pct={delta} />
            <span className="text-[12px] text-ink-muted">
              vs last month
              {prevTotal > 0 ? ` · ${Math.round(prevTotal)} QAR` : ""}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">Transactions</div>
          <div className="tabular mt-1 font-display text-[24px] font-semibold tracking-display text-ink">
            {txCount}
          </div>
        </div>
      </div>
    </header>
  );
}
