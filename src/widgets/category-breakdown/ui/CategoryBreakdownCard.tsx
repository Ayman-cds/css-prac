import { Card } from "@/shared/ui/card";
import { CategoryDonut } from "@/shared/ui/charts";

type CatRow = {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  total: number;
};

export function CategoryBreakdownCard({
  breakdown,
  total,
  hint = "this month",
  title = "By category",
}: {
  breakdown: CatRow[];
  total: number;
  hint?: string;
  title?: string;
}) {
  const donutData = breakdown.map((c) => ({ name: c.name, value: c.total, color: c.color }));
  return (
    <Card title={title} hint={hint}>
      <CategoryDonut data={donutData} total={total} />
      <ul className="mt-4 space-y-1.5">
        {breakdown.slice(0, 6).map((c) => (
          <li key={c.slug} className="flex items-center justify-between text-[13px]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              <span className="text-ink">
                {c.emoji} {c.name}
              </span>
            </span>
            <span className="tabular text-ink-muted">
              {Math.round((c.total / Math.max(total, 1)) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
