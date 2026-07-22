import Link from "next/link";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/app/brand-logo";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { BarChart3, Building2, CreditCard, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

const nav = [
  ["Overview", "/admin", LayoutDashboard],
  ["Companies", "/admin/companies", Building2],
  ["Payments", "/admin/payments", CreditCard],
  ["Reports", "/admin/reports", BarChart3],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await requirePlatformAdmin();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(103,232,249,0.14),transparent_32rem),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.12),transparent_28rem)]" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-80 border-r border-white/10 bg-slate-950/80 p-4 backdrop-blur-2xl lg:block">
          <Link href="/admin" className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-3">
            <BrandLogo className="h-11 w-11" />
            <span>
              <span className="block text-lg font-black">CRM.Space</span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Super Admin</span>
            </span>
          </Link>

          <div className="mt-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <ShieldCheck className="h-5 w-5 text-cyan-100" />
            <p className="mt-2 text-sm font-black">Owner access</p>
            <p className="mt-1 break-all text-xs leading-5 text-slate-300">{String(admin.email)}</p>
          </div>

          <nav className="mt-5 grid gap-2">
            {nav.map(([label, href, Icon]) => (
              <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-slate-950/40 text-cyan-100 transition group-hover:border-cyan-300/30">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </Link>
            ))}
          </nav>

          <form action={logout} className="absolute bottom-4 left-4 right-4">
            <button className="premium-button w-full border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </aside>

        <section className="min-w-0 flex-1 lg:ml-80">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur-2xl lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Platform control center</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Super Admin Panel</h1>
              </div>
              <Link href="/dashboard" className="premium-button border border-white/10 bg-white/[0.045] px-4 py-2 text-sm text-slate-100">
                Company dashboard
              </Link>
            </div>
          </header>
          <div className="px-4 py-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
