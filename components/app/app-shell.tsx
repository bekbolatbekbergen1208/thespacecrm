import Link from "next/link";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/app/brand-logo";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { NavLink } from "@/components/app/nav-link";
import { effectiveEmployeeRoutes, normalizeAllowedRoutes, routeIsAllowed } from "@/lib/employee-permissions";
import { getIndustryDashboardConfig } from "@/lib/industry-dashboard";
import { translateLiteral, type getDictionary, type Locale } from "@/lib/i18n";
import type { Role } from "@/lib/supabase/types";
import { Bell, ChevronDown, Command, LogOut, Plus, Search, Sparkles } from "lucide-react";

export function AppShell({
  children,
  companyName,
  companyId,
  inviteCode,
  role,
  position,
  allowedRoutes = [],
  businessType,
  dashboardRoute,
  dictionary,
  locale,
  pendingAccessCount = 0,
  notificationCount = 0,
}: {
  children: React.ReactNode;
  companyName: string;
  companyId: string;
  inviteCode: string;
  role: Role;
  position?: string | null;
  allowedRoutes?: string[];
  businessType?: string | null;
  dashboardRoute: string;
  dictionary: ReturnType<typeof getDictionary>;
  locale: Locale;
  pendingAccessCount?: number;
  notificationCount?: number;
}) {
  const nav = getIndustryDashboardConfig(businessType).nav;
  const t = dictionary;
  const isMentor = role === "employee" && String(position ?? "").toLowerCase().includes("mentor");
  const employeeRoutes = effectiveEmployeeRoutes({
    allowedRoutes: normalizeAllowedRoutes(allowedRoutes),
    dashboardRoute,
    position,
  });
  const visibleNav = role === "employee" ? nav.filter(([, href]) => routeIsAllowed(href, employeeRoutes)) : nav;
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.08),transparent_34rem)]" />
      <div className="relative z-10 flex min-h-screen flex-col lg:block">
        <aside className="border-b border-white/10 bg-slate-950/[0.78] p-3 backdrop-blur-2xl lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:h-screen lg:w-80 lg:overflow-hidden lg:border-b-0 lg:border-r lg:p-4">
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Link href={dashboardRoute} className="group flex min-w-0 items-center gap-3">
              <BrandLogo className="h-10 w-10" />
              <span className="min-w-0">
                <span className="block truncate text-base font-black tracking-tight">CRM.Space</span>
                <span className="block truncate text-xs text-slate-400">{t.premiumCrm}</span>
              </span>
            </Link>
            <span className="hidden rounded-full border border-cyan-300/[0.18] bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 sm:inline-flex">
              {t.live}
            </span>
          </div>

          <details open className="group/company mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span>
                <span className="block truncate text-sm font-bold text-white">{companyName}</span>
                <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-cyan-100">{role}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500 transition group-open/company:rotate-180" />
            </summary>
            <div className="mt-4 space-y-3">
              {businessType && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/[0.45] px-3 py-2 text-xs text-slate-300">
                  <span className="text-slate-500">{t.industry}</span>
                  <span className="mt-1 block font-semibold text-slate-100">{businessType}</span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/[0.45] px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-500">{t.companyId}</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-200">{companyId}</p>
                </div>
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
                  <p className="text-[11px] font-semibold text-cyan-100/70">{t.inviteCode}</p>
                  <p className="mt-1 font-mono text-sm font-bold text-cyan-100">{inviteCode}</p>
                </div>
              </div>
            </div>
          </details>

          <details open className="group/nav mt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              {t.navigation}
              <ChevronDown className="h-4 w-4 transition group-open/nav:rotate-180" />
            </summary>
            <nav className="mt-1 grid max-h-[44vh] gap-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-420px)]">
              <NavLink href={dashboardRoute} label={t.dashboard} iconKey="Dashboard" />
              {isMentor && <NavLink href="/dashboard/mentor" label={translateLiteral(locale, "Мои группы")} iconKey="Группы" />}
              {!!pendingAccessCount && (
                <NavLink href="/dashboard/employees" label={translateLiteral(locale, "Заявки")} iconKey="Employees" badge={pendingAccessCount} />
              )}
              {visibleNav.map(([label, href]) => (
                <NavLink key={`${label}-${href}`} href={href} label={translateLiteral(locale, label)} iconKey={label} />
              ))}
              <NavLink href="/dashboard/profile" label={t.profile} iconKey="Profile" />
            </nav>
          </details>

          <form action={logout} className="mt-4">
            <button className="premium-button w-full border border-red-300/[0.16] bg-red-500/[0.08] px-4 py-2.5 text-left text-sm text-red-100 hover:border-red-300/[0.35] hover:bg-red-500/[0.12]">
              <LogOut className="h-4 w-4" />
              {t.logout}
            </button>
          </form>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col lg:ml-80 lg:min-h-screen">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-2xl lg:px-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Link href={dashboardRoute} className="transition hover:text-cyan-100">{t.workspace}</Link>
                  <span>/</span>
                  <span className="truncate text-slate-300">{companyName}</span>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  {t.premiumCrm}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <form action="/dashboard/education/students" className="relative min-w-0 sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    name="q"
                    placeholder={t.searchPlaceholder}
                    className="premium-input h-10 w-full pl-10 pr-12 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-500 sm:inline-flex">
                    <Command className="h-3 w-3" /> K
                  </span>
                </form>
                <LanguageSwitcher compact />
                <Link href="/dashboard/notifications" className={`premium-button relative h-10 w-10 border text-slate-200 ${
                  notificationCount
                    ? "border-red-300/30 bg-red-500/15 shadow-[0_0_24px_rgba(239,68,68,0.3)] hover:bg-red-500/20"
                    : "border-white/10 bg-white/[0.045] hover:bg-white/[0.08]"
                }`} aria-label={t.notifications}>
                  <Bell className="h-4 w-4" />
                  {!!notificationCount && (
                    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                      {notificationCount}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard/education/students" className="premium-button h-10 border border-cyan-200/20 bg-white px-4 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
                  <Plus className="h-4 w-4" />
                  {t.addStudent}
                </Link>
              </div>
            </div>
          </header>

          <div className="page-enter flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
          CRM Space
        </p>
        <h1 className="gradient-text text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </header>
  );
}

export function Card({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return <div className={`premium-card p-5 ${className}`} {...props}>{children}</div>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}
