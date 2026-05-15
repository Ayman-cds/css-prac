"use client";

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatQar } from "@/shared/lib";

export function DailyBars({ data }: { data: { label: string; total: number }[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(235,235,245,0.30)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            stroke="rgba(235,235,245,0.30)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v: number) => [formatQar(v), "Spent"]}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.total > 0 ? "#0a84ff" : "rgba(255,255,255,0.08)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
