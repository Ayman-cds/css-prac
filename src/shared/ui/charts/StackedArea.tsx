"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatQar } from "@/shared/lib";

const PALETTE = [
  "#0a84ff",
  "#30d158",
  "#ff9f0a",
  "#bf5af2",
  "#ff375f",
  "#64d2ff",
  "#ffd60a",
  "#5e5ce6",
  "#ff453a",
  "#8e8e93",
  "#ff9f0a",
];

export function StackedArea({
  data,
  keys,
  keyLabels,
}: {
  data: Array<Record<string, number | string>>;
  keys: string[];
  keyLabels?: Record<string, string>;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.55} />
                <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(235,235,245,0.30)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(235,235,245,0.30)" fontSize={10} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            formatter={(v: number, name: string) => [formatQar(v), keyLabels?.[name] ?? name]}
            cursor={{ stroke: "rgba(255,255,255,0.10)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "rgba(235,235,245,0.60)" }}
            iconType="circle"
            iconSize={8}
            formatter={(v: string) => keyLabels?.[v] ?? v}
          />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={PALETTE[i % PALETTE.length]}
              fill={`url(#grad-${k})`}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
