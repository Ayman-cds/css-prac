"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatQar } from "@/shared/lib";

export function TrendLine({ data }: { data: { label: string; total: number }[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendStroke" x1="0" x2="1">
              <stop offset="0%" stopColor="#0a84ff" />
              <stop offset="100%" stopColor="#bf5af2" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(235,235,245,0.30)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis
            stroke="rgba(235,235,245,0.30)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => (v === 0 ? "" : `${Math.round(v)}`)}
          />
          <Tooltip
            formatter={(v: number) => [formatQar(v), "Spent"]}
            cursor={{ stroke: "rgba(255,255,255,0.10)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="url(#trendStroke)"
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4, fill: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
