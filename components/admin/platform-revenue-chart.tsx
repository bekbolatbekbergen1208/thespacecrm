"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PlatformRevenueChart({ data }: { data: { month: string; revenue: number; companies: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="platformRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(2,6,23,0.94)",
              border: "1px solid rgba(103,232,249,0.22)",
              borderRadius: 18,
              color: "white",
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#67e8f9" strokeWidth={3} fill="url(#platformRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
