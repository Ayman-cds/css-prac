import { formatDate } from "@/shared/lib";
import { TransactionRow } from "./TransactionRow";
import type { TransactionWithCategory } from "../model/types";

function groupByDay(txs: TransactionWithCategory[]) {
  const map = new Map<string, TransactionWithCategory[]>();
  for (const t of txs) {
    const k = t.occurred_at.slice(0, 10);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function TransactionList({
  transactions,
  group = true,
  empty = "No transactions yet.",
}: {
  transactions: TransactionWithCategory[];
  group?: boolean;
  empty?: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
        {empty}
      </div>
    );
  }

  if (!group) {
    return (
      <ul className="-mx-3 divide-y divide-line/40">
        {transactions.map((tx) => (
          <li key={tx.id}>
            <TransactionRow tx={tx} />
          </li>
        ))}
      </ul>
    );
  }

  const groups = groupByDay(transactions);
  return (
    <div className="space-y-5">
      {groups.map(([day, items]) => (
        <div key={day}>
          <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-dim">
            {formatDate(day)}
          </div>
          <ul className="-mx-3 divide-y divide-line/40">
            {items.map((tx) => (
              <li key={tx.id}>
                <TransactionRow tx={tx} showDate={false} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
