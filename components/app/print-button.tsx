"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  label = "Печать",
  floating = false,
}: {
  label?: string;
  floating?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        floating
          ? "no-print fixed bottom-5 right-5 z-50 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-glow transition hover:bg-cyan-50"
          : "no-print premium-button h-11 border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm text-cyan-100"
      }
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
