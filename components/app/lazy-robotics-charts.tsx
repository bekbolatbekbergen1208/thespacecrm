"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n";

const RoboticsCharts = dynamic(() => import("@/components/app/robotics-charts").then((mod) => mod.RoboticsCharts), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="premium-card h-72 animate-pulse p-5">
          <div className="h-5 w-32 rounded-full bg-white/10" />
          <div className="mt-8 h-44 rounded-3xl bg-white/[0.05]" />
        </div>
      ))}
    </div>
  ),
});

export function LazyRoboticsCharts({ locale }: { locale: Locale }) {
  return <RoboticsCharts locale={locale} />;
}
