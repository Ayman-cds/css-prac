import Link from "next/link";
import { Amount, DeltaPill } from "@/shared/ui/amount";
import { pctChange } from "@/shared/lib";
import type { Anomaly } from "@/features/anomaly-detection";

const REASON_LABEL: Record<Anomaly["reason"], string> = {
  high_amount: "Unusually large purchase",
  new_merchant_large: "New merchant, big spend",
  category_spike: "Category spending spike",
};

export function HeadlineCard({
  monthLabel,
  total,
  prevTotal,
  txCount,
  anomalies,
}: {
  monthLabel: string;
  total: number;
  prevTotal: number;
  txCount: number;
  anomalies: Anomaly[];
}) {
  const delta = pctChange(total, prevTotal);
  const preview = anomalies.slice(0, 2);
  const moreCount = Math.max(0, anomalies.length - preview.length);

  return (
    <section className="glass rounded-3xl p-5 shadow-card md:p-7">
      <div className="text-[11px] font-medium uppercase tracking-[0.10em] text-ink-dim">
        {monthLabel}
      </div>

      <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Amount amount={total} size="hero" />
          <div className="mt-2 flex items-center gap-2">
            <DeltaPill pct={delta} />
            <span className="text-[12px] text-ink-muted">
              vs last month
              {prevTotal > 0 ? ` · ${Math.round(prevTotal).toLocaleString()} QAR` : ""}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">
            Transactions
          </div>
          <div className="tabular mt-1 font-display text-[24px] font-semibold tracking-display text-ink">
            {txCount}
          </div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center justify-between">
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
