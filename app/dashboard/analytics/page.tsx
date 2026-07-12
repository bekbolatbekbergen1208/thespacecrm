import { Card, PageHeader } from "@/components/app/app-shell";
import { canManage, requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function AnalyticsPage() {
  const [{ supabase, membership }, locale] = await Promise.all([requireUser(), getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  const companyId = membership!.company_id;
  if (!canManage(membership!.role)) {
    return (
      <>
        <PageHeader title={tt("Analytics dashboard")} description={tt("Analytics are available to workspace managers.")} />
        <Card><p className="text-sm text-slate-300">{tt("Your employee dashboard shows assigned tasks, customer records, notifications, and profile settings.")}</p></Card>
      </>
    );
  }
  const [{ data: customers }, { data: employees }, { data: tasks }, { data: items }] = await Promise.all([
    supabase.from("customers").select("status, value, created_at").eq("company_id", companyId),
    supabase.from("employees").select("salary").eq("company_id", companyId),
    supabase.from("tasks").select("status").eq("company_id", companyId),
    supabase.from("inventory_items").select("quantity, price, reorder_level").eq("company_id", companyId),
  ]);

  const pipeline = customers?.reduce((sum, customer) => sum + Number(customer.value), 0) ?? 0;
  const payroll = employees?.reduce((sum, employee) => sum + Number(employee.salary), 0) ?? 0;
  const completedTasks = tasks?.filter((task) => task.status === "done").length ?? 0;
  const completionRate = tasks?.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const stockValue = items?.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0) ?? 0;
  const lowStock = items?.filter((item) => item.quantity <= item.reorder_level).length ?? 0;

  return (
    <>
      <PageHeader title={tt("Analytics dashboard")} description={tt("Business intelligence generated from live CRM.Space records.")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card><p className="text-sm text-slate-400">{tt("Pipeline value")}</p><p className="mt-2 text-3xl font-black">${pipeline.toLocaleString()}</p></Card>
        <Card><p className="text-sm text-slate-400">{tt("Monthly payroll")}</p><p className="mt-2 text-3xl font-black">${payroll.toLocaleString()}</p></Card>
        <Card><p className="text-sm text-slate-400">{tt("Task completion")}</p><p className="mt-2 text-3xl font-black">{completionRate}%</p></Card>
        <Card><p className="text-sm text-slate-400">{tt("Inventory value")}</p><p className="mt-2 text-3xl font-black">${stockValue.toLocaleString()}</p></Card>
        <Card><p className="text-sm text-slate-400">{tt("Low stock items")}</p><p className="mt-2 text-3xl font-black">{lowStock}</p></Card>
        <Card>
          <p className="text-sm text-slate-400">{tt("AI insight")}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {completionRate < 60
              ? tt("Task completion needs attention. Review assignment load and due dates.")
              : tt("Operations are moving steadily. Monitor stock risks and customer pipeline value.")}
          </p>
        </Card>
      </div>
    </>
  );
}
