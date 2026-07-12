import { approveEmployeeAccess, deleteEmployee, saveEmployee } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Field, SmallButton } from "@/components/app/forms";
import { canAdmin, canManage, requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, membership }, params, locale] = await Promise.all([requireUser(), searchParams, getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  if (!canManage(membership!.role)) {
    return (
      <>
        <PageHeader title={tt("Employee management")} description={tt("Only founders, admins, and managers can review employee access.")} />
        <EmptyState text={tt("Your employee access is available from the Employee Dashboard and Profile Settings.")} />
      </>
    );
  }
  const company = Array.isArray(membership!.companies) ? membership!.companies[0] : membership!.companies;
  const [{ data: employees }, { data: accessRequests }] = await Promise.all([
    supabase.from("employees").select("*").eq("company_id", membership!.company_id).order("created_at", { ascending: false }),
    canManage(membership!.role)
      ? supabase.from("employee_access_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  const pendingRequests = accessRequests?.filter((request) => request.company_id === membership!.company_id || (!request.company_id && request.company_name.toLowerCase() === company?.name.toLowerCase())) ?? [];

  return (
    <>
      <PageHeader title={tt("Employee management")} description={tt("Maintain employee records, roles, contacts, and payroll information.")} />
      {params.error && <p className="mb-4 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
      {canManage(membership!.role) && (
        <Card className="mb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">{tt("Pending access requests")}</h2>
              <p className="mt-1 text-sm text-slate-400">{tt("Approve employee requests before they can enter this workspace.")}</p>
            </div>
            <span className="text-sm font-bold text-cyan-100">{pendingRequests.length} {tt("pending")}</span>
          </div>
          <div className="mt-4 space-y-3">
            {!pendingRequests.length && <p className="text-sm text-slate-400">{tt("No pending employee requests.")}</p>}
            {pendingRequests.map((request) => (
              <div key={request.id} className="grid gap-3 rounded-[8px] bg-slate-950/70 px-4 py-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-white">{request.full_name}</p>
                  <p className="mt-1 text-slate-400">{request.position} - {request.company_name}</p>
                  {request.invite_code && <p className="mt-1 font-mono text-xs text-cyan-100">{tt("Invite")} {request.invite_code}</p>}
                </div>
                <form action={approveEmployeeAccess}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <SmallButton>{tt("Approve")}</SmallButton>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}
      {canAdmin(membership!.role) && (
        <Card>
          <form action={saveEmployee} className="grid gap-4 md:grid-cols-5">
            <Field label={tt("Name")} name="name" />
            <Field label={tt("Email")} name="email" type="email" required={false} />
            <Field label={tt("Phone")} name="phone" required={false} />
            <Field label={tt("Position")} name="position" defaultValue={tt("Employee")} />
            <Field label={tt("Salary")} name="salary" type="number" defaultValue={0} />
            <div className="md:col-span-5"><SmallButton>{tt("Add employee")}</SmallButton></div>
          </form>
        </Card>
      )}
      <div className="mt-5 space-y-3">
        {!employees?.length && <EmptyState text={canAdmin(membership!.role) ? tt("No employees yet. Add employee records above.") : tt("No employees yet.")} />}
        {employees?.map((employee) => (
          <Card key={employee.id}>
            {canAdmin(membership!.role) ? (
              <>
                <form action={saveEmployee} className="grid gap-4 md:grid-cols-6">
                  <input type="hidden" name="id" value={employee.id} />
                  <Field label={tt("Name")} name="name" defaultValue={employee.name} />
                  <Field label={tt("Email")} name="email" type="email" defaultValue={employee.email ?? ""} required={false} />
                  <Field label={tt("Phone")} name="phone" defaultValue={employee.phone ?? ""} required={false} />
                  <Field label={tt("Position")} name="position" defaultValue={employee.position} />
                  <Field label={tt("Salary")} name="salary" type="number" defaultValue={employee.salary} />
                  <div className="flex items-end gap-2"><SmallButton>{tt("Save")}</SmallButton></div>
                </form>
                <form action={deleteEmployee} className="mt-3">
                  <input type="hidden" name="id" value={employee.id} />
                  <SmallButton danger>{tt("Delete employee")}</SmallButton>
                </form>
              </>
            ) : (
              <div className="grid gap-2 text-sm md:grid-cols-4">
                <p className="font-semibold text-white">{employee.name}</p>
                <p className="text-slate-400">{employee.position}</p>
                <p className="text-slate-400">{employee.email ?? tt("No email")}</p>
                <p className="text-slate-400">{employee.phone ?? tt("No phone")}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
