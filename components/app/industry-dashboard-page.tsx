import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import { dashboardRouteForStoredIndustry, getIndustryDashboardConfigBySlug } from "@/lib/industry-dashboard";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { ArrowRight, BarChart3, CheckCircle2, CircleDollarSign, Layers3 } from "lucide-react";

export async function IndustryDashboardPage({ slug }: { slug: string }) {
  const [{ supabase, membership, user }, locale] = await Promise.all([requireUser(), getServerLocale()]);
  const companyId = membership!.company_id;
  const company = Array.isArray(membership!.companies) ? membership!.companies[0] : membership!.companies;
  const config = getIndustryDashboardConfigBySlug(slug);
  const expectedRoute = membership!.dashboard_route || company?.dashboard_route || dashboardRouteForStoredIndustry(company?.business_type);
  if (config.route !== expectedRoute) redirect(expectedRoute);

  const [{ data: employee }, customers, employees, tasks, inventory] = await Promise.all([
    supabase.from("employees").select("id, name, position").eq("company_id", companyId).eq("user_id", user.id).maybeSingle(),
    supabase.from("customers").select("value", { count: "exact" }).eq("company_id", companyId),
    supabase.from("employees").select("salary", { count: "exact" }).eq("company_id", companyId),
    supabase.from("tasks").select("status, assignee_id", { count: "exact" }).eq("company_id", companyId),
    supabase.from("inventory_items").select("quantity, price, reorder_level", { count: "exact" }).eq("company_id", companyId),
  ]);

  const revenue = customers.data?.reduce((sum, item) => sum + Number(item.value), 0) ?? 0;
  const payroll = employees.data?.reduce((sum, item) => sum + Number(item.salary), 0) ?? 0;
  const openTasks = tasks.data?.filter((task) => task.status !== "done").length ?? 0;
  const myTasks = tasks.data?.filter((task) => task.assignee_id === employee?.id && task.status !== "done").length ?? 0;
  const inventoryValue = inventory.data?.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0) ?? 0;
  const lowStock = inventory.data?.filter((item) => item.quantity <= item.reorder_level).length ?? 0;

  return (
    <>
      <PageHeader
        title={translateLiteral(locale, config.title)}
        description={`${company?.name ?? translateLiteral(locale, "Your workspace")} - ${translateLiteral(locale, config.description)}`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <MetricIcon><CheckCircle2 className="h-4 w-4" /></MetricIcon>
          <p className="mt-4 text-sm font-semibold text-slate-400">{membership!.role === "employee" ? translateLiteral(locale, "My open tasks") : translateLiteral(locale, config.stats[0]?.label ?? "")}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{membership!.role === "employee" ? myTasks : customers.count ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">{membership!.role === "employee" ? employee?.position ?? translateLiteral(locale, "Employee") : translateLiteral(locale, config.stats[0]?.note ?? "")}</p>
        </Card>
        <Card>
          <MetricIcon><Layers3 className="h-4 w-4" /></MetricIcon>
          <p className="mt-4 text-sm font-semibold text-slate-400">{translateLiteral(locale, config.stats[1]?.label ?? "")}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{openTasks}</p>
          <p className="mt-1 text-xs text-slate-500">{translateLiteral(locale, config.stats[1]?.note ?? "")}</p>
        </Card>
        <Card>
          <MetricIcon><CircleDollarSign className="h-4 w-4" /></MetricIcon>
          <p className="mt-4 text-sm font-semibold text-slate-400">{translateLiteral(locale, config.stats[2]?.label ?? "")}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">${revenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">{translateLiteral(locale, "Pipeline value")}</p>
        </Card>
        <Card>
          <MetricIcon><BarChart3 className="h-4 w-4" /></MetricIcon>
          <p className="mt-4 text-sm font-semibold text-slate-400">{translateLiteral(locale, "Workspace health")}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{employees.count ?? 0}</p>
          <p className="mt-1 text-xs text-cyan-100">Payroll ${payroll.toLocaleString()} - Stock ${inventoryValue.toLocaleString()} - {lowStock} low</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {config.windows.map((window) => (
          <Link key={window.title} href={window.href} className="block">
            <Card className="h-full">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">{translateLiteral(locale, window.metric)}</p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h2 className="text-lg font-black tracking-tight text-white">{translateLiteral(locale, window.title)}</h2>
                <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-slate-400">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{translateLiteral(locale, window.detail)}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="font-bold">{translateLiteral(locale, "Operational status")}</h2>
          <div className="mt-4 space-y-3">
            {["todo", "in_progress", "done"].map((status) => {
              const count = tasks.data?.filter((task) => task.status === status).length ?? 0;
              return (
                <div key={status} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/[0.55] px-4 py-3 text-sm transition hover:bg-white/[0.045]">
                  <span className="capitalize text-slate-300">{translateLiteral(locale, status.replace("_", " "))}</span>
                  <span className="font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">{translateLiteral(locale, "Reports")}</h2>
          <div className="mt-4 grid gap-2">
            {config.reports.map((report) => (
              <Link key={report} href="/dashboard/analytics" className="rounded-2xl border border-white/10 bg-slate-950/[0.55] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.045]">
                {translateLiteral(locale, report)}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function MetricIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
      {children}
    </span>
  );
}
