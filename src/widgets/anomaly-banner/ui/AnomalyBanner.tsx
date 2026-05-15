import Link from "next/link";
import { Card } from "@/shared/ui/card";
import { Amount } from "@/shared/ui/amount";
import type { Anomaly } from "@/features/anomaly-detection";

const REASON_LABEL: Record<Anomaly["reason"], string> = {
  high_amount: "Unusually large purchase",
  new_merchant_large: "New merchant, big spend",
  category_spike: "Category spending spike",
};

export function AnomalyBanner({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) return null;
  return (
    <Card title="Anomalies" hint="vs. 90-day baseline">
      <ul className="-mx-2 divide-y divide-line/40">
        {anomalies.map((a) => (
          <li key={a.transactionId}>
            <Link
              href={`/transactions/${a.transactionId}`}
              className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-bg-hover"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warn/15 text-warn">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-ink">{a.merchantRaw}</div>
                <div className="mt-0.5 text-[12px] text-ink-muted">
                  {REASON_LABEL[a.reason]} · {a.detail}
                </div>
              </div>
              <Amount amount={a.amountQar} size="md" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
