export function DashboardSkeleton({ title = "Загрузка раздела" }: { title?: string }) {
  return (
    <div className="animate-pulse space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
        <div className="h-4 w-32 rounded-full bg-cyan-200/20" />
        <div className="mt-5 h-9 w-72 max-w-full rounded-2xl bg-white/10" />
        <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-white/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="h-10 w-10 rounded-2xl bg-cyan-200/15" />
            <div className="mt-5 h-5 w-28 rounded-full bg-white/10" />
            <div className="mt-3 h-8 w-20 rounded-2xl bg-white/10" />
          </div>
        ))}
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="h-6 w-48 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-72 rounded-full bg-white/10" />
          </div>
          <div className="h-10 w-32 rounded-full bg-cyan-200/15" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4 sm:grid-cols-5">
              <div className="h-5 rounded-full bg-white/10" />
              <div className="h-5 rounded-full bg-white/10" />
              <div className="h-5 rounded-full bg-white/10" />
              <div className="h-5 rounded-full bg-white/10" />
              <div className="h-9 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
