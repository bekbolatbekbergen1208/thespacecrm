"use client";

import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { translateLiteral, type Locale } from "@/lib/i18n";

const monthlyRevenue = [
  { month: "Jan", value: 420000 },
  { month: "Feb", value: 510000 },
  { month: "Mar", value: 610000 },
  { month: "Apr", value: 690000 },
  { month: "May", value: 760000 },
  { month: "Jun", value: 840000 },
];

const attendance = [
  { week: "W1", value: 82 },
  { week: "W2", value: 88 },
  { week: "W3", value: 79 },
  { week: "W4", value: 91 },
];

const studentGrowth = [
  { month: "Jan", value: 42 },
  { month: "Feb", value: 48 },
  { month: "Mar", value: 55 },
  { month: "Apr", value: 63 },
  { month: "May", value: 71 },
  { month: "Jun", value: 84 },
];

export function RoboticsCharts({ locale }: { locale: Locale }) {
  const monthlyRevenueData = monthlyRevenue.map((item) => ({ ...item, month: translateLiteral(locale, item.month) }));
  const attendanceData = attendance.map((item) => ({ ...item, week: translateLiteral(locale, item.week) }));
  const studentGrowthData = studentGrowth.map((item) => ({ ...item, month: translateLiteral(locale, item.month) }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title={translateLiteral(locale, "Доход по месяцам")} liveLabel={translateLiteral(locale, "Live")}>
        <AreaChart data={monthlyRevenueData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.44} />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(103,232,249,0.24)" }} />
          <Area type="monotone" dataKey="value" stroke="#67e8f9" strokeWidth={3} fill="url(#revenueGradient)" animationDuration={900} />
        </AreaChart>
      </ChartCard>
      <ChartCard title={translateLiteral(locale, "Посещаемость")} liveLabel={translateLiteral(locale, "Live")}>
        <BarChart data={attendanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="week" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(167,139,250,0.08)" }} />
          <Bar dataKey="value" fill="#a78bfa" radius={[10, 10, 4, 4]} animationDuration={900} />
        </BarChart>
      </ChartCard>
      <ChartCard title={translateLiteral(locale, "Рост учеников")} liveLabel={translateLiteral(locale, "Live")}>
        <AreaChart data={studentGrowthData}>
          <defs>
            <linearGradient id="studentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(52,211,153,0.24)" }} />
          <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} fill="url(#studentGradient)" animationDuration={900} />
        </AreaChart>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, liveLabel, children }: { title: string; liveLabel: string; children: React.ReactElement }) {
  return (
    <motion.div
      className="premium-card p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
      whileHover={{ y: -3 }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-black tracking-tight">{title}</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{liveLabel}</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

const tooltipStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "14px",
  background: "rgba(2,6,23,0.88)",
  color: "#f8fafc",
  boxShadow: "0 20px 60px rgba(0,0,0,0.34)",
};
