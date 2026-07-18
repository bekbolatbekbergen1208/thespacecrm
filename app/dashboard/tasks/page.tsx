import { deleteTask, saveTask } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Field, Select, SmallButton, Textarea } from "@/components/app/forms";
import { canManage, requireMembership } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, membership, user }, params, locale] = await Promise.all([requireMembership(), searchParams, getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  const companyId = membership!.company_id;
  const editable = canManage(membership!.role);
  const [{ data: tasks }, { data: employees }, { data: myEmployee }] = await Promise.all([
    supabase.from("tasks").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("employees").select("id, name").eq("company_id", companyId).order("name"),
    supabase.from("employees").select("id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle(),
  ]);
  const visibleTasks = editable ? tasks : tasks?.filter((task) => task.assignee_id === myEmployee?.id);

  return (
    <>
      <PageHeader title={editable ? tt("Task management") : tt("My Tasks")} description={editable ? tt("Create, assign, track, and complete operational tasks.") : tt("View tasks assigned to your employee profile.")} />
      {params.error && <p className="mb-4 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
      {editable && <Card>
        <form action={saveTask} className="grid gap-4 md:grid-cols-4">
          <Field label={tt("Title")} name="title" />
          <Select label={tt("Assignee")} name="assigneeId"><option value="">{tt("Unassigned")}</option>{employees?.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select>
          <Select label={tt("Status")} name="status"><option value="todo">{tt("Todo")}</option><option value="in_progress">{tt("In progress")}</option><option value="done">{tt("Done")}</option></Select>
          <Field label={tt("Due date")} name="dueDate" type="date" required={false} />
          <div className="md:col-span-4"><Textarea label={tt("Description")} name="description" /></div>
          <div className="md:col-span-4"><SmallButton>{tt("Add task")}</SmallButton></div>
        </form>
      </Card>}
      <div className="mt-5 space-y-3">
        {!visibleTasks?.length && <EmptyState text={editable ? tt("No tasks yet. Create the first task above.") : tt("No tasks assigned to you yet.")} />}
        {visibleTasks?.map((task) => (
          <Card key={task.id}>
            {editable ? (
              <>
                <form action={saveTask} className="grid gap-4 md:grid-cols-5">
                  <input type="hidden" name="id" value={task.id} />
                  <Field label={tt("Title")} name="title" defaultValue={task.title} />
                  <Select label={tt("Assignee")} name="assigneeId" defaultValue={task.assignee_id}>
                    <option value="">{tt("Unassigned")}</option>
                    {employees?.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                  </Select>
                  <Select label={tt("Status")} name="status" defaultValue={task.status}>
                    <option value="todo">{tt("Todo")}</option>
                    <option value="in_progress">{tt("In progress")}</option>
                    <option value="done">{tt("Done")}</option>
                  </Select>
                  <Field label={tt("Due date")} name="dueDate" type="date" defaultValue={task.due_date ?? ""} required={false} />
                  <div className="flex items-end"><SmallButton>{tt("Save")}</SmallButton></div>
                  <div className="md:col-span-5"><Textarea label={tt("Description")} name="description" defaultValue={task.description} /></div>
                </form>
                <form action={deleteTask} className="mt-3">
                  <input type="hidden" name="id" value={task.id} />
                  <SmallButton danger>{tt("Delete task")}</SmallButton>
                </form>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-white">{task.title}</h2>
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold capitalize text-cyan-100">{tt(task.status.replace("_", " "))}</span>
                </div>
                <p className="leading-6 text-slate-300">{task.description ?? tt("No description")}</p>
                <p className="text-slate-400">{task.due_date ? `${tt("Due")} ${task.due_date}` : tt("No due date")}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
