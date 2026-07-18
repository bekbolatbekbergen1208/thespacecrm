import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { canManage, requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function NotificationsPage() {
  const [{ supabase, membership, user }, locale] = await Promise.all([requireUser(), getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  const companyId = membership!.company_id;
  const company = Array.isArray(membership!.companies) ? membership!.companies[0] : membership!.companies;
  const [{ data: employee }, { data: tasks }, { data: inventory }, { data: accessRequests }] = await Promise.all([
    supabase.from("employees").select("id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle(),
    supabase.from("tasks").select("title, status, due_date, assignee_id").eq("company_id", companyId).order("due_date", { ascending: true }),
    supabase.from("inventory_items").select("name, quantity, reorder_level").eq("company_id", companyId),
    canManage(membership!.role)
      ? supabase.from("employee_access_requests").select("full_name, position, company_id, company_name").eq("status", "pending").order("created_at", { ascending: true }).limit(100)
      : Promise.resolve({ data: [] }),
  ]);
  const pendingRequests = accessRequests?.filter((request) => (
    request.company_id === companyId
    || (!request.company_id && request.company_name.toLowerCase() === company?.name.toLowerCase())
  )) ?? [];

  const notices = [
    ...pendingRequests.map((request) => ({
      title: `${tt("Pending access requests")}: ${request.full_name}`,
      text: `${request.position} - ${tt("Approve employee requests before they can enter this workspace.")}`,
      href: "/dashboard/employees",
    })),
    ...(tasks ?? [])
      .filter((task) => membership!.role !== "employee" || task.assignee_id === employee?.id)
      .filter((task) => task.status !== "done")
      .map((task) => ({
        title: task.title,
        text: task.due_date ? `${tt("Open task due")} ${task.due_date}` : tt("Open task without a due date"),
        href: "/dashboard/tasks",
      })),
    ...(membership!.role === "employee"
      ? []
      : (inventory ?? [])
          .filter((item) => item.quantity <= item.reorder_level)
          .map((item) => ({ title: item.name, text: `${tt("Low stock:")} ${item.quantity} ${tt("remaining")}`, href: "/dashboard/inventory" }))),
  ];

  return (
    <>
      <PageHeader title={tt("Notifications")} description={tt("Live operational alerts generated from your CRM.Space data.")} />
      <div className="space-y-3">
        {!notices.length && <EmptyState text={tt("No active notifications.")} />}
        {notices.map((notice) => (
          <a key={`${notice.title}-${notice.text}`} href={notice.href} className="block transition hover:scale-[1.01]">
            <Card>
              <p className="font-bold text-white">{notice.title}</p>
              <p className="mt-2 text-sm text-slate-300">{notice.text}</p>
            </Card>
          </a>
        ))}
      </div>
    </>
  );
}
