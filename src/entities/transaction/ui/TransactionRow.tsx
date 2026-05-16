import Link from "next/link";
import { cn, dirFor, formatDate } from "@/shared/lib";
import { CategoryBadge } from "@/entities/category";
import { Amount } from "@/shared/ui/amount";
import type { TransactionWithCategory } from "../model/types";

export function TransactionRow({
  tx,
  showDate = true,
  className,
}: {
  tx: TransactionWithCategory;
  showDate?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/transactions/${tx.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-bg-hover",
        tx.hidden && "opacity-50",
        className,
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px]"
        style={{
          backgroundColor: tx.category?.color
            ? `${tx.category.color}24`
            : "rgba(255,255,255,0.06)",
        }}
      >
        {tx.category?.emoji ?? "💳"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[14px] font-medium text-ink" dir={dirFor(tx.merchant_raw)}>
            {tx.merchant_raw}
          </span>
          {tx.card_last_digit && (
            <span className="text-[10px] uppercase tracking-wider text-ink-dim">
              ·{tx.card_last_digit}
            </span>
          )}
          {tx.hidden && (
            <span className="rounded-full bg-warn/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-warn">
              hidden
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-muted">
          <CategoryBadge
            emoji={tx.category?.emoji}
            name={tx.category?.name}
            color={tx.category?.color}
            size="sm"
          />
          {showDate && <span>{formatDate(tx.occurred_at, { time: true })}</span>}
        </div>
      </div>
      <div className="text-right">
        <Amount amount={tx.amount_qar} size="md" approximate={tx.is_approximate} />
      </div>
    </Link>
  );
}
