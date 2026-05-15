import type { Insight } from "@/features/auto-insights";
import { cn } from "@/shared/lib";

const TONE: Record<Insight["tone"], { bg: string; ring: string; dot: string; icon: string }> = {
  up: { bg: "bg-danger/10", ring: "ring-danger/30", dot: "text-danger", icon: "↑" },
  down: { bg: "bg-success/10", ring: "ring-success/30", dot: "text-success", icon: "↓" },
  warning: { bg: "bg-warn/10", ring: "ring-warn/30", dot: "text-warn", icon: "!" },
  neutral: { bg: "bg-bg-elev", ring: "ring-line", dot: "text-ink-muted", icon: "•" },
};

export function InsightsStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-3 sm:grid sm:grid-cols-3">
        {insights.map((ins, i) => {
          const t = TONE[ins.tone];
          return (
            <div
              key={i}
              className={cn(
                "min-w-[280px] flex-shrink-0 rounded-2xl p-4 ring-1 sm:min-w-0",
                t.bg,
                t.ring,
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    t.bg,
                    t.dot,
                  )}
                >
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-ink">{ins.headline}</div>
                  <div className="mt-0.5 text-[12px] text-ink-muted">{ins.detail}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
