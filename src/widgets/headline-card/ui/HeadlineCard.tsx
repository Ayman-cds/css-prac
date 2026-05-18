import Link from "next/link";
import { Amount, DeltaPill } from "@/shared/ui/amount";
import { pctChange } from "@/shared/lib";
import type { Anomaly } from "@/features/anomaly-detection";

const REASON_LABEL: Record<Anomaly["reason"], string> = {
  high_amount: "Unusually large purchase",
  new_merchant_large: "New merchant, big spend",
  category_spike: "Category spending spike",
};

type Stat = { total: number; count: number };

export function HeadlineCard({
  monthLabel,
  today,
  week,
  month,
  prevMonthTotal,
  anomalies,
}: {
  monthLabel: string;
  today: Stat;
  week: Stat;
  month: Stat;
  prevMonthTotal: number;
  anomalies: Anomaly[];
}) {
  const monthDelta = pctChange(month.total, prevMonthTotal);
  const preview = anomalies.slice(0, 2);
  const moreCount = Math.max(0, anomalies.length - preview.length);

  return (
    <section className="glass rounded-3xl p-5 shadow-card md:p-7">
      <div className="text-[11px] font-medium uppercase tracking-[0.10em] text-ink-dim">
        {monthLabel}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatBlock label="Today" total={today.total} count={today.count} />
        <StatBlock label="This week" total={week.total} count={week.count} />
        <StatBlock
          label="This month"
          total={month.total}
          count={month.count}
          delta={monthDelta}
          emphasized
        />
      </div>

      {anomalies.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.10em] text-warn">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
              <path
                d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {anomalies.length} {anomalies.length === 1 ? "anomaly" : "anomalies"}
          </div>
          <ul className="mt-2 space-y-1.5">
            {preview.map((a) => (
              <li key={a.transactionId}>
                <Link
                  href={`/transactions/${a.transactionId}`}
                  className="flex items-baseline justify-between gap-3 rounded-lg px-1 py-1 text-[13px] hover:bg-bg-hover"
                >
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {REASON_LABEL[a.reason]} ·{" "}
                    <span className="text-ink-muted">{a.merchantRaw}</span>
                  </span>
                  <span className="tabular shrink-0 text-ink">
                    {Math.round(a.amountQar).toLocaleString()} QAR
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {moreCount > 0 && (
            <div className="mt-2 text-[12px] text-ink-muted">
              +{moreCount} more below
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatBlock({
  label,
  total,
  count,
  delta,
  emphasized = false,
}: {
  label: string;
  total: number;
  count: number;
  delta?: number | null;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "rounded-2xl bg-bg-elev p-3 ring-1 ring-line"
          : "p-1"
      }
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.10em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1.5">
        <Amount amount={total} size={emphasized ? "lg" : "md"} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {delta != null && <DeltaPill pct={delta} />}
        <span className="text-[11px] text-ink-muted">
          {count} {count === 1 ? "tx" : "tx"}
        </span>
      </div>
    </div>
  );
}
