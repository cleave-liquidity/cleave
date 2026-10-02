"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { MarketDataMode } from "@/types/market";

const MOCK_HISTORICAL_DATA = [
  { date: "May", underlying: 6.8, implied: 6.2 },
  { date: "Jun", underlying: 7.4, implied: 6.35 },
  { date: "Jul", underlying: 7.1, implied: 6.4 },
  { date: "Aug", underlying: 6.95, implied: 6.38 },
  { date: "Sep", underlying: 7.25, implied: 6.42 },
  { date: "Oct", underlying: 7.1, implied: 6.42 },
];

export function YieldChart({
  underlyingApy,
  impliedApy,
  dataMode,
}: {
  underlyingApy: number;
  impliedApy: number;
  dataMode: MarketDataMode;
}) {
  const chartData = dataMode === "live"
    ? [{ date: "Now", underlying: underlyingApy, implied: impliedApy }]
    : [
        ...MOCK_HISTORICAL_DATA.slice(0, 5),
        { date: "Now", underlying: underlyingApy, implied: impliedApy },
      ];

  return (
    <figure
      className="border border-white/14 rounded-[10px] bg-surface p-5 sm:p-6 flex flex-col gap-4"
      aria-labelledby="yield-chart-title"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <h4 id="yield-chart-title" className="m-0 text-[16px] font-medium text-foreground">
            Yield History & Implied Rate
          </h4>
          <span className="text-[12px] text-muted-dark">
            {dataMode === "live"
              ? "Current live rate vs implied price"
              : "Trailing 6 months vs current implied price"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-ice" />
            <span className="text-muted">Implied APY ({impliedApy}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber" />
            <span className="text-muted">Rate Now ({underlyingApy}%)</span>
          </div>
        </div>
      </div>

      <div className="h-[240px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 8" stroke="rgba(236,237,234,0.06)" />
            <XAxis
              dataKey="date"
              stroke="#6F7471"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "rgba(236,237,234,0.12)" }}
            />
            <YAxis
              stroke="#6F7471"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "rgba(236,237,234,0.12)" }}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0B0B0D",
                borderColor: "rgba(236,237,234,0.2)",
              borderRadius: "2px",
                fontSize: "13px",
              }}
              formatter={(value: number) => [`${value}%`]}
            />
            <Line
              type="monotone"
              dataKey="implied"
              name="Implied APY"
              stroke="#A9C8EE"
              strokeWidth={1.6}
              dot={false}
              activeDot={{ fill: "#A9C8EE", r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="underlying"
              name="Rate Now"
              stroke="#F0A85C"
              strokeWidth={1.6}
              dot={false}
              activeDot={{ fill: "#F0A85C", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {dataMode === "live"
          ? `Current live comparison of implied APY and underlying rate. Implied APY is ${impliedApy}% and the current underlying rate is ${underlyingApy}%.`
          : `Historical comparison of implied APY and underlying rate. Implied APY is ${impliedApy}% and the current underlying rate is ${underlyingApy}%.`}
      </figcaption>
    </figure>
  );
}
