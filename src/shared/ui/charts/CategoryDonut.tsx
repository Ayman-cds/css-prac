"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatQar } from "@/shared/lib";

type Slice = { name: string; value: number; color: string };

export function CategoryDonut({
  data,
  total,
}: {
  data: Slice[];
  total: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-ink-dim">
        No spend this month
      </div>
    );
  }
  return (
    <div className="relative h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={86}
            outerRadius={108}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [formatQar(v), n]}
            cursor={{ fill: "transparent" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">this month</span>
        <span className="tabular mt-1 font-display text-[26px] font-semibold tracking-display text-ink">
          {formatQar(total)}
        </span>
      </div>
    </div>
  );
}
