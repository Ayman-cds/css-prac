import { Card } from "@/shared/ui/card";
import { TrendLine } from "@/shared/ui/charts";

export function DailyTrendCard({
  data,
  hint = "last 30 days",
  title = "Daily spending",
}: {
  data: { label: string; total: number }[];
  hint?: string;
  title?: string;
}) {
  const avg =
    data.length > 0
      ? Math.round(data.reduce((a, b) => a + b.total, 0) / data.length)
      : 0;
  return (
    <Card title={title} hint={hint}>
      <TrendLine data={data} />
      <div className="mt-3 flex items-center justify-between text-[12px] text-ink-muted">
        <span>Daily avg</span>
        <span className="tabular text-ink">{avg} QAR</span>
      </div>
    </Card>
  );
}
