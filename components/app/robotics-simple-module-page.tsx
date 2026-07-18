import { deleteRoboticsRecord, saveRoboticsRecord } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { RoboticsRecordForm } from "@/components/app/robotics-record-form";
import { SmallButton } from "@/components/app/forms";
import { requireMembership } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerDictionary, getServerLocale } from "@/lib/i18n-server";
import { getRoboticsModule, type RoboticsModuleKey } from "@/lib/robotics-crm";
import { ArrowUpDown, Filter, Pencil, Search, Table2 } from "lucide-react";

type RoboticsRow = {
  id: string;
  company_id: string;
  created_at: string;
  [key: string]: string | number | null;
};

export async function RoboticsSimpleModulePage({
  moduleKey,
  searchParams,
}: {
  moduleKey: RoboticsModuleKey;
  searchParams?: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string; sort?: string; order?: "asc" | "desc" }>;
}) {
  const [{ supabase, membership }, params, t, locale] = await Promise.all([
    requireMembership(),
    searchParams ?? Promise.resolve({} as { error?: string; q?: string; status?: string; group?: string; mentor?: string; sort?: string; order?: "asc" | "desc" }),
    getServerDictionary(),
    getServerLocale(),
  ]);
  const crmModule = getRoboticsModule(moduleKey);
  if (!crmModule.table) return null;

  const companyId = membership!.company_id;
  const { data, error } = await supabase
    .from(crmModule.table)
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as RoboticsRow[];
  const directories = await loadSimpleDirectories({ supabase, companyId, moduleKey, fields: crmModule.fields, rows });
  const formFields = withDirectoryOptions(crmModule.fields, directories);
  const filtered = rows.filter((row) => {
    const text = Object.values(row).join(" ").toLowerCase();
    const q = params.q?.toLowerCase() ?? "";
    const status = params.status?.toLowerCase() ?? "";
    const group = params.group?.toLowerCase() ?? "";
    const mentor = params.mentor?.toLowerCase() ?? "";
    return (!q || text.includes(q))
      && (!status || String(row.status ?? "").toLowerCase() === status)
      && (!group || String(row.group_name ?? row.name ?? "").toLowerCase() === group)
      && (!mentor || String(row.mentor_name ?? "").toLowerCase().includes(mentor));
  }).sort((a, b) => {
    if (!params.sort) return 0;
    const direction = params.order === "desc" ? -1 : 1;
    return String(a[params.sort] ?? "").localeCompare(String(b[params.sort] ?? ""), undefined, { numeric: true }) * direction;
  });

  return (
    <>
      <PageHeader title={translateLiteral(locale, crmModule.title)} description={translateLiteral(locale, crmModule.description)} />
      {params.error && <Notice tone="danger" text={params.error} />}
      {error && <Notice tone="danger" text={error.message} />}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <MetricCard label={t.total} value={rows.length} />
        <MetricCard label={t.filter} value={filtered.length} />
        <MetricCard label={t.active} value={rows.filter((row) => row.status === "active" || row.status === "оплачено").length} />
        <MetricCard label={t.attention} value={warningCount(moduleKey, rows)} warning />
      </div>

      <Card>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{t.fastInput}</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">{t.addRecord}</h2>
          </div>
        </div>
        <RoboticsRecordForm moduleKey={crmModule.key} fields={formFields} action={saveRoboticsRecord} dictionary={t} locale={locale} />
      </Card>

      <Card className="mt-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500"><Table2 className="h-3.5 w-3.5" /> {t.dataTable}</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">{t.table}</h2>
          </div>
          <form className="grid gap-2 sm:grid-cols-5 lg:w-auto">
            <label className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="q" placeholder={t.search} defaultValue={params.q ?? ""} className="premium-input h-10 w-full pl-9 pr-3 text-sm text-white outline-none" />
            </label>
            <input name="group" placeholder={t.group} defaultValue={params.group ?? ""} className="premium-input h-10 w-full px-3 text-sm text-white outline-none" />
            <input name="status" placeholder={t.status} defaultValue={params.status ?? ""} className="premium-input h-10 w-full px-3 text-sm text-white outline-none" />
            <SmallButton><Filter className="h-3.5 w-3.5" /> {t.filter}</SmallButton>
          </form>
        </div>
        {!filtered.length && <EmptyState text={t.noRecords} />}
        {!!filtered.length && (
          <div className="max-h-[620px] overflow-auto rounded-3xl border border-white/10 bg-slate-950/[0.35]">
            <table className="premium-table w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {crmModule.columns.map((column) => (
                    <th key={column} className="px-4 py-4">
                      <a href={sortHref(params, column)} className="inline-flex items-center gap-2 transition hover:text-cyan-100">
                        {translateLiteral(locale, labelize(column))}
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </a>
                    </th>
                  ))}
                  <th className="px-4 py-4">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((row) => (
                  <tr key={row.id} className={isWarningRow(moduleKey, row) ? "bg-red-500/10" : ""}>
                    {crmModule.columns.map((column, index) => (
                      <td key={column} className="px-4 py-4 text-slate-200">
                        <span className={index === 0 ? "font-bold text-white" : ""}>{translateLiteral(locale, String(row[column] ?? "-"))}</span>
                      </td>
                    ))}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <details className="group rounded-2xl border border-white/10 bg-slate-950/40 p-2">
                          <summary className="flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
                            <Pencil className="h-3.5 w-3.5" /> {translateLiteral(locale, "Редактировать")}
                          </summary>
                          <div className="mt-3 w-[min(720px,70vw)]">
                            <RoboticsRecordForm
                              moduleKey={crmModule.key}
                              fields={formFields}
                              action={saveRoboticsRecord}
                              dictionary={t}
                              locale={locale}
                              record={row}
                              submitLabel={translateLiteral(locale, "Сохранить изменения")}
                            />
                          </div>
                        </details>
                        <form action={deleteRoboticsRecord}>
                          <input type="hidden" name="module" value={crmModule.key} />
                          <input type="hidden" name="id" value={row.id} />
                          <SmallButton danger>{t.delete}</SmallButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

async function loadSimpleDirectories({
  supabase,
  companyId,
  moduleKey,
  fields,
  rows,
}: {
  supabase: Awaited<ReturnType<typeof requireMembership>>["supabase"];
  companyId: string;
  moduleKey: RoboticsModuleKey;
  fields: ReturnType<typeof getRoboticsModule>["fields"];
  rows: RoboticsRow[];
}) {
  const fieldNames = new Set(fields.map((field) => field.name));
  const needsStudents = fieldNames.has("student_name") || fieldNames.has("children");
  const needsGroups = fieldNames.has("group_name");
  const needsMentors = fieldNames.has("mentor_name") || fieldNames.has("assignee") || fieldNames.has("responsible");
  const [studentsResult, groupsResult, mentorsResult, employeesResult] = await Promise.all([
    needsStudents && moduleKey !== "students"
      ? supabase.from("robotics_students").select("id, first_name, last_name, group_name, mentor_name, created_at, company_id").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: moduleKey === "students" ? rows : [], error: null }),
    needsGroups && moduleKey !== "groups"
      ? supabase.from("robotics_groups").select("id, name, mentor_name, created_at, company_id").eq("company_id", companyId).order("created_at", { ascending: false }).limit(300)
      : Promise.resolve({ data: moduleKey === "groups" ? rows : [], error: null }),
    needsMentors && moduleKey !== "mentors"
      ? supabase.from("robotics_mentors").select("id, name, position, created_at, company_id").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: moduleKey === "mentors" ? rows : [], error: null }),
    needsMentors
      ? supabase.from("employees").select("id, name, position, company_id").eq("company_id", companyId).order("name", { ascending: true }).limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    students: (studentsResult.data ?? []) as RoboticsRow[],
    groups: (groupsResult.data ?? []) as RoboticsRow[],
    mentors: (mentorsResult.data ?? []) as RoboticsRow[],
    employees: (employeesResult.data ?? []) as unknown as RoboticsRow[],
  };
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function withDirectoryOptions(
  fields: ReturnType<typeof getRoboticsModule>["fields"],
  directories: { students: RoboticsRow[]; groups: RoboticsRow[]; mentors: RoboticsRow[]; employees: RoboticsRow[] },
) {
  const studentNames = unique(directories.students.map(fullName).filter((name) => name !== "-"));
  const groupNames = unique(directories.groups.map((group) => String(group.name ?? "")).filter(Boolean));
  const mentorNames = unique([
    ...directories.mentors.map((mentor) => String(mentor.name ?? "")).filter(Boolean),
    ...directories.employees
      .filter((employee) => String(employee.position ?? "").toLowerCase().includes("mentor"))
      .map((employee) => String(employee.name ?? ""))
      .filter(Boolean),
  ]);

  return fields.map((field) => {
    if ((field.name === "student_name" || field.name === "children") && studentNames.length) return { ...field, type: "select" as const, options: studentNames };
    if (field.name === "group_name" && groupNames.length) return { ...field, type: "select" as const, options: groupNames };
    if (field.name === "mentor_name" && mentorNames.length) return { ...field, type: "select" as const, options: mentorNames };
    if ((field.name === "assignee" || field.name === "responsible") && mentorNames.length) return { ...field, type: "select" as const, options: mentorNames };
    return field;
  });
}

function fullName(row: RoboticsRow) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || String(row.student_name ?? row.name ?? "-");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function warningCount(moduleKey: RoboticsModuleKey, rows: RoboticsRow[]) {
  if (moduleKey === "subscriptions") return rows.filter((row) => Number(row.remaining_lessons ?? 0) <= 2).length;
  if (moduleKey === "payments") return rows.filter((row) => row.status !== "оплачено").length;
  if (moduleKey === "attendance") return rows.filter((row) => row.status === "отсутствовал").length;
  return rows.filter((row) => row.status === "paused" || row.status === "archived" || row.status === "high").length;
}

function isWarningRow(moduleKey: RoboticsModuleKey, row: RoboticsRow) {
  if (moduleKey === "subscriptions") return Number(row.remaining_lessons ?? 0) <= 2;
  if (moduleKey === "payments") return row.status !== "оплачено";
  if (moduleKey === "attendance") return row.status === "отсутствовал";
  return false;
}

function sortHref(params: { q?: string; status?: string; group?: string; mentor?: string; sort?: string; order?: "asc" | "desc" }, column: string) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.group) query.set("group", params.group);
  if (params.mentor) query.set("mentor", params.mentor);
  query.set("sort", column);
  query.set("order", params.sort === column && params.order !== "desc" ? "desc" : "asc");
  return `?${query.toString()}`;
}

function MetricCard({ label, value, warning = false }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <Card className={warning ? "border-red-300/20 bg-red-500/[0.06]" : ""}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${warning ? "text-red-100" : "text-white"}`}>{value}</p>
    </Card>
  );
}

function Notice({ text, tone }: { text: string; tone: "danger" | "success" }) {
  return (
    <p className={`mb-4 rounded-2xl border p-3 text-sm font-semibold ${
      tone === "danger" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
    }`}>
      {text}
    </p>
  );
}
