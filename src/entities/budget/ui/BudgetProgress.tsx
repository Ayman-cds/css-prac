import { cn, formatQar } from "@/shared/lib";
import { CategoryBadge } from "@/entities/category";

export function BudgetProgress({
  category,
  spent,
  limit,
}: {
  category: { slug: string; name: string; emoji: string; color: string };
  spent: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = spent >= limit;
  const warn = pct >= 80 && !over;

  return (
    <div className="rounded-2xl bg-bg-elev p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <CategoryBadge
          emoji={category.emoji}
          name={category.name}
          color={category.color}
          size="sm"
        />
        <span
          className={cn(
            "tabular text-[12px] font-medium",
            over ? "text-danger" : warn ? "text-warn" : "text-ink-muted",
          )}
        >
          {formatQar(spent)} <span className="text-ink-dim">/ {formatQar(limit)}</span>
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over ? "bg-danger" : warn ? "bg-warn" : "bg-success",
          )}
          style={{
            width: `${pct}%`,
            backgroundColor: over ? undefined : warn ? undefined : category.color,
          }}
        />
      </div>
    </div>
  );
}
