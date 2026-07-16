export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-slate-950/80 p-4 lg:block">
          <div className="h-20 animate-pulse rounded-3xl bg-white/[0.06]" />
          <div className="mt-5 h-40 animate-pulse rounded-3xl bg-white/[0.04]" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="border-b border-white/10 bg-slate-950/70 px-4 py-4 lg:px-8">
            <div className="h-12 animate-pulse rounded-2xl bg-white/[0.05]" />
          </header>
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="h-28 animate-pulse rounded-3xl bg-white/[0.05]" />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/[0.05]" />
              ))}
            </div>
            <div className="mt-5 h-96 animate-pulse rounded-3xl bg-white/[0.04]" />
          </div>
        </section>
      </div>
    </main>
  );
}
