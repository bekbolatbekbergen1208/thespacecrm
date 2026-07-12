import {
  assignStudentToGroup,
  assignStudentsToGroup,
  confirmStudentPayment,
  createLessonsFromGroupSchedule,
  deleteRoboticsRecord,
  removeStudentFromGroup,
  saveLessonAttendance,
  saveJournalAttendance,
  saveRoboticsRecord,
  saveStudentGrade,
} from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { PaymentReminderLink } from "@/components/app/payment-reminder-link";
import { RoboticsExportButtons } from "@/components/app/robotics-export-buttons";
import { RoboticsRecordForm } from "@/components/app/robotics-record-form";
import { SmallButton } from "@/components/app/forms";
import { requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerDictionary, getServerLocale } from "@/lib/i18n-server";
import { getRoboticsModule, type RoboticsModuleKey } from "@/lib/robotics-crm";
import { ArrowUpDown, CalendarDays, Check, Clock, Filter, History, MessageCircle, Pencil, Search, ShieldAlert, Sparkles, Star, Table2, UserPlus, Users, X } from "lucide-react";

type RoboticsRow = {
  id: string;
  company_id: string;
  created_at: string;
  [key: string]: string | number | null;
};

export async function RoboticsModulePage({
  moduleKey,
  searchParams,
}: {
  moduleKey: RoboticsModuleKey;
  searchParams?: Promise<{ error?: string; q?: string; status?: string; group?: string; mentor?: string; room?: string; view?: "day" | "week" | "month"; sort?: string; order?: "asc" | "desc" }>;
}) {
  const [{ supabase, membership }, params, t, locale] = await Promise.all([
    requireUser(),
    searchParams ?? Promise.resolve({} as { error?: string; q?: string; status?: string; group?: string; mentor?: string; room?: string; view?: "day" | "week" | "month"; sort?: string; order?: "asc" | "desc" }),
    getServerDictionary(),
    getServerLocale(),
  ]);
  const crmModule = getRoboticsModule(moduleKey);
  const companyId = membership!.company_id;

  if (!crmModule.table) {
    const [studentsResult, attendanceResult, subscriptionsResult, gradesResult, lessonsResult] = await Promise.all([
      supabase.from("robotics_students").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("robotics_attendance").select("*").eq("company_id", companyId).order("lesson_date", { ascending: false }).limit(1000),
      supabase.from("robotics_subscriptions").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500),
      supabase.from("robotics_grades").select("*").eq("company_id", companyId).order("grade_date", { ascending: false }).limit(1000),
      supabase.from("robotics_lessons").select("*").eq("company_id", companyId).order("lesson_date", { ascending: true }).order("lesson_time", { ascending: true }).limit(1000),
    ]);

    return (
      <>
        <PageHeader title={translateLiteral(locale, crmModule.title)} description={translateLiteral(locale, crmModule.description)} />
        <ReportsPanel
          locale={locale}
          students={(studentsResult.data ?? []) as RoboticsRow[]}
          attendance={(attendanceResult.data ?? []) as RoboticsRow[]}
          subscriptions={(subscriptionsResult.data ?? []) as RoboticsRow[]}
          grades={(gradesResult.data ?? []) as RoboticsRow[]}
          lessons={(lessonsResult.data ?? []) as RoboticsRow[]}
        />
      </>
    );
  }

  const { data, error } = await supabase
    .from(crmModule.table)
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as RoboticsRow[];
  const filtered = rows.filter((row) => {
    const text = Object.values(row).join(" ").toLowerCase();
    const q = params.q?.toLowerCase() ?? "";
    const status = params.status?.toLowerCase() ?? "";
    const group = params.group?.toLowerCase() ?? "";
    const mentor = params.mentor?.toLowerCase() ?? "";
    const room = params.room?.toLowerCase() ?? "";
    return (!q || text.includes(q))
      && (!status || String(row.status ?? "").toLowerCase() === status)
      && (!group || String(row.group_name ?? row.name ?? "").toLowerCase() === group)
      && (!mentor || String(row.mentor_name ?? "").toLowerCase().includes(mentor))
      && (!room || String(row.room ?? "").toLowerCase().includes(room));
  }).sort((a, b) => {
    const sortKey = params.sort;
    if (!sortKey) return 0;
    const direction = params.order === "desc" ? -1 : 1;
    return String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true }) * direction;
  });

  const [studentsResult, groupsResult, mentorsResult, employeesResult, lessonsResult, paymentsResult, attendanceResult, subscriptionsResult] = await Promise.all([
    supabase.from("robotics_students").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("robotics_groups").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("robotics_mentors").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("employees").select("*").eq("company_id", companyId).order("name", { ascending: true }),
    moduleKey === "groups"
      ? supabase.from("robotics_lessons").select("*").eq("company_id", companyId).order("lesson_date", { ascending: false }).limit(300)
      : Promise.resolve({ data: [], error: null }),
    moduleKey === "groups" || moduleKey === "attendance" || moduleKey === "payments"
      ? supabase.from("robotics_payments").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(300)
      : Promise.resolve({ data: [], error: null }),
    moduleKey === "groups" || moduleKey === "schedule" || moduleKey === "attendance"
      ? supabase.from("robotics_attendance").select("*").eq("company_id", companyId).order("lesson_date", { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
    moduleKey === "attendance" || moduleKey === "payments"
      ? supabase.from("robotics_subscriptions").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(300)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const students = (studentsResult.data ?? []) as RoboticsRow[];
  const groups = (groupsResult.data ?? []) as RoboticsRow[];
  const mentors = (mentorsResult.data ?? []) as RoboticsRow[];
  const employees = (employeesResult.data ?? []) as RoboticsRow[];
  const lessons = moduleKey === "schedule" ? filtered : (lessonsResult.data ?? []) as RoboticsRow[];
  const payments = (paymentsResult.data ?? []) as RoboticsRow[];
  const attendance = (attendanceResult.data ?? []) as RoboticsRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as RoboticsRow[];
  const formFields = withDirectoryOptions(crmModule.fields, { students, groups, mentors, employees });

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

      {moduleKey === "payments" ? (
        <PaymentConfirmPanel students={students} payments={payments} subscriptions={subscriptions} params={params} />
      ) : (
        <Card>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{t.fastInput}</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">{t.addRecord}</h2>
            </div>
            <RoboticsExportButtons title={translateLiteral(locale, crmModule.title)} rows={filtered} />
          </div>
          <RoboticsRecordForm moduleKey={crmModule.key} fields={formFields} action={saveRoboticsRecord} dictionary={t} locale={locale} />
        </Card>
      )}

      {moduleKey === "groups" && (
        <GroupsPanel groups={filtered} students={students} mentors={mentors} employees={employees} lessons={lessons} payments={payments} attendance={attendance} />
      )}

      {moduleKey === "schedule" && (
        <CalendarPanel rows={filtered} students={students} attendance={attendance} params={params} />
      )}

      {moduleKey === "attendance" && (
        <AttendanceJournalPanel students={students} attendance={attendance} payments={payments} subscriptions={subscriptions} params={params} />
      )}

      <Card className="mt-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500"><Table2 className="h-3.5 w-3.5" /> {t.dataTable}</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">{t.table}</h2>
          </div>
          <form className="grid gap-2 sm:grid-cols-6 lg:w-auto">
            <label className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="q" placeholder={t.search} defaultValue={params.q ?? ""} className="premium-input h-10 w-full pl-9 pr-3 text-sm text-white outline-none" />
            </label>
            <input name="group" placeholder={t.group} defaultValue={params.group ?? ""} className="premium-input h-10 w-full px-3 text-sm text-white outline-none" />
            <input name="status" placeholder={t.status} defaultValue={params.status ?? ""} className="premium-input h-10 w-full px-3 text-sm text-white outline-none" />
            <input name="mentor" placeholder={translateLiteral(locale, "Ментор")} defaultValue={params.mentor ?? ""} className="premium-input h-10 w-full px-3 text-sm text-white outline-none" />
            <input name="room" placeholder={translateLiteral(locale, "Кабинет")} defaultValue={params.room ?? ""} className="premium-input h-10 w-full px-3 text-sm text-white outline-none" />
            <div className="sm:col-span-6">
              <SmallButton><Filter className="h-3.5 w-3.5" /> {t.filter}</SmallButton>
            </div>
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
    if ((field.name === "student_name" || field.name === "children") && studentNames.length) {
      return { ...field, type: "select" as const, options: studentNames };
    }
    if (field.name === "group_name" && groupNames.length) {
      return { ...field, type: "select" as const, options: groupNames };
    }
    if (field.name === "mentor_name" && mentorNames.length) {
      return { ...field, type: "select" as const, options: mentorNames };
    }
    if ((field.name === "assignee" || field.name === "responsible") && mentorNames.length) {
      return { ...field, type: "select" as const, options: mentorNames };
    }
    return field;
  });
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function PaymentConfirmPanel({
  students,
  payments,
  subscriptions,
  params,
}: {
  students: RoboticsRow[];
  payments: RoboticsRow[];
  subscriptions: RoboticsRow[];
  params: { q?: string; group?: string };
}) {
  const q = params.q?.toLowerCase() ?? "";
  const group = params.group?.toLowerCase() ?? "";
  const visibleStudents = students.filter((student) => {
    const text = Object.values(student).join(" ").toLowerCase();
    return (!q || text.includes(q)) && (!group || String(student.group_name ?? "").toLowerCase() === group);
  });

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Оплата</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Подтверждение оплаты учеников</h2>
          <p className="mt-2 text-sm text-slate-400">Нажми “Оплачено”, чтобы создать оплату и продлить абонемент ученика.</p>
        </div>
        <form className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Поиск ученика" className="premium-input h-10 px-3 text-sm text-white outline-none" />
          <input name="group" defaultValue={params.group ?? ""} placeholder="Группа" className="premium-input h-10 px-3 text-sm text-white outline-none" />
          <SmallButton><Search className="h-3.5 w-3.5" /> Найти</SmallButton>
        </form>
      </div>

      {!visibleStudents.length && <EmptyState text="Сначала добавь учеников в модуле “Ученики”, потом они появятся здесь для подтверждения оплаты." />}
      {!!visibleStudents.length && (
        <div className="grid gap-3">
          {visibleStudents.map((student) => {
            const name = fullName(student);
            const latestSubscription = subscriptions.find((item) => item.student_name === name);
            const latestPayment = payments.find((item) => item.student_name === name);
            const remaining = Number(latestSubscription?.remaining_lessons ?? 0);
            const total = Number(latestSubscription?.total_lessons ?? 8) || 8;
            const isExpired = remaining <= 0;
            const isLow = remaining > 0 && remaining <= 2;
            return (
              <div key={student.id} className={`grid gap-3 rounded-3xl border p-4 lg:grid-cols-[1fr_160px_180px_150px] lg:items-center ${
                isExpired ? "border-red-300/30 bg-red-500/10" : isLow ? "border-yellow-300/30 bg-yellow-500/10" : "border-white/10 bg-white/[0.035]"
              }`}>
                <div>
                  <p className="text-lg font-black text-white">{name}</p>
                  <p className="mt-1 text-sm text-slate-400">{String(student.group_name ?? "Без группы")} • {String(student.mentor_name ?? "Ментор не выбран")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Осталось</p>
                  <p className={`mt-1 text-2xl font-black ${isExpired ? "text-red-100" : isLow ? "text-yellow-100" : "text-emerald-100"}`}>{remaining}/{total}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Последняя оплата</p>
                  <p className="mt-1 text-sm font-bold text-slate-200">{latestPayment?.paid_at ? String(latestPayment.paid_at) : "Нет оплаты"}</p>
                </div>
                <form action={confirmStudentPayment}>
                  <input type="hidden" name="studentName" value={name} />
                  <input type="hidden" name="groupName" value={String(student.group_name ?? "")} />
                  <button className="premium-button h-11 w-full bg-emerald-300 px-5 text-sm font-black text-emerald-950 shadow-glow hover:bg-emerald-200">
                    <Check className="h-4 w-4" />
                    Оплачено
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AttendanceJournalPanel({
  students,
  attendance,
  payments,
  subscriptions,
  params,
}: {
  students: RoboticsRow[];
  attendance: RoboticsRow[];
  payments: RoboticsRow[];
  subscriptions: RoboticsRow[];
  params: { q?: string; status?: string; group?: string; mentor?: string; room?: string };
}) {
  const today = new Date().toISOString().slice(0, 10);
  const q = params.q?.toLowerCase() ?? "";
  const group = params.group?.toLowerCase() ?? "";
  const visibleStudents = students.filter((student) => {
    const text = Object.values(student).join(" ").toLowerCase();
    return (!q || text.includes(q)) && (!group || String(student.group_name ?? "").toLowerCase() === group);
  });

  return (
    <section className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f7fbff] text-slate-950 shadow-2xl shadow-cyan-950/20">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-5 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Центр управления</p>
            <h2 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Табель посещаемости</h2>
          </div>
          <form className="grid gap-2 md:grid-cols-[1fr_180px_auto] xl:min-w-[720px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="q" defaultValue={params.q ?? ""} placeholder="Поиск по ученикам, группам, родителям" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
            </label>
            <input name="group" defaultValue={params.group ?? ""} placeholder="Группа" className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
            <button className="h-14 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-700">Найти</button>
          </form>
        </div>
      </div>

      {!visibleStudents.length && (
        <div className="p-8">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Ученики пока не добавлены. Добавь ученика в модуле “Ученики”, и он сразу появится в этом журнале.
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-200">
        {visibleStudents.map((student, index) => {
          const name = fullName(student);
          const history = attendance.filter((item) => item.student_name === name);
          const todayRecord = history.find((item) => item.lesson_date === today);
          const latestSubscription = subscriptions.find((item) => item.student_name === name);
          const latestPayment = payments.find((item) => item.student_name === name);
          const remaining = Number(latestSubscription?.remaining_lessons ?? 0);
          const total = Number(latestSubscription?.total_lessons ?? 0) || 8;
          const isPaid = Boolean(latestSubscription) || latestPayment?.status === "оплачено";
          const paymentEnded = remaining <= 0;
          const paymentLow = remaining > 0 && remaining <= 2;
          const weekCount = history.filter((item) => daysBetween(String(item.lesson_date ?? today), today) <= 7).length;
          const missed = missedLessonsCount(attendance, name);

          return (
            <div key={student.id} className={`grid min-h-44 gap-4 px-5 py-6 md:px-8 xl:grid-cols-[220px_120px_120px_220px_110px_1fr_120px] xl:items-center ${
              paymentEnded || missed >= 8 ? "bg-red-50" : paymentLow ? "bg-yellow-50" : index % 2 === 0 ? "bg-[#eef6ff]" : "bg-white"
            }`}>
              <div>
                <p className="text-xl font-black text-slate-950">{name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{String(student.notes ?? "Программа A")}</p>
                <p className="text-sm font-semibold text-slate-500">{String(student.status ?? "active")}</p>
              </div>

              <div>
                <p className="text-lg font-black text-slate-900">{String(student.group_name ?? "Без группы")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{String(student.mentor_name ?? "Ментор")}</p>
              </div>

              <div className="w-fit rounded-2xl bg-emerald-100 px-6 py-4 text-center text-emerald-800">
                <p className="text-xl font-black">#{index + 1}</p>
                <p className="text-sm font-black">{remaining || 0}/{total}</p>
              </div>

              <div className={`flex w-fit items-center gap-3 rounded-2xl border px-5 py-4 ${
                paymentEnded ? "border-rose-200 bg-rose-50 text-rose-700" : paymentLow ? "border-yellow-200 bg-yellow-50 text-yellow-700" : isPaid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
              }`}>
                <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${paymentEnded ? "bg-rose-500" : paymentLow ? "bg-yellow-500" : isPaid ? "bg-emerald-500" : "bg-rose-500"}`}>
                  {paymentEnded ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-lg font-black">{paymentEnded ? "Оплата кончилась" : paymentLow ? "Осталось мало" : isPaid ? "Оплата есть" : "Нет оплаты"}</p>
                  <p className="text-xs font-bold">{remaining || 0} занятий</p>
                </div>
              </div>

              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-violet-200 bg-violet-100 text-xl font-black text-violet-700">
                  {weekCount}
                </div>
                <p className="mt-1 text-xs font-bold text-slate-500">за неделю</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {Array.from({ length: 8 }).map((_, itemIndex) => {
                  const record = history[itemIndex];
                  return (
                    <span key={`${student.id}-${itemIndex}`} className={`grid h-11 w-11 place-items-center rounded-2xl text-lg font-black ${
                      record?.status === "присутствовал" || record?.status === "опоздал"
                        ? "bg-emerald-100 text-emerald-700"
                        : record?.status === "отсутствовал"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-slate-100 text-slate-400"
                    }`}>
                      {record ? statusShort(String(record.status)) : itemIndex + 1}
                    </span>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-950">{history.length}</p>
                  <p className="text-xs font-bold leading-4 text-slate-500">посещений<br />в истории</p>
                </div>
                <div className="grid gap-2">
                  <JournalStatusButton student={student} status="присутствовал" date={today} active={todayRecord?.status === "присутствовал"} />
                  <JournalStatusButton student={student} status="опоздал" date={today} active={todayRecord?.status === "опоздал"} />
                  <JournalStatusButton student={student} status="отсутствовал" date={today} active={todayRecord?.status === "отсутствовал"} danger />
                  <a href={`/dashboard/education/subscriptions?group=${encodeURIComponent(String(student.group_name ?? ""))}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black text-slate-800 transition hover:border-blue-200 hover:text-blue-700">Оплач. дни</a>
                  <a href={student.whatsapp || student.parent_phone ? `https://wa.me/${String(student.whatsapp ?? student.parent_phone).replace(/\D/g, "")}` : "#"} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:border-emerald-200 hover:text-emerald-700">
                    <MessageCircle className="h-3.5 w-3.5" /> Сообщения
                  </a>
                  <details className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800">
                    <summary className="flex cursor-pointer items-center justify-center gap-1"><History className="h-3.5 w-3.5" /> История</summary>
                    <div className="mt-2 max-h-32 overflow-auto text-left text-[11px] font-semibold text-slate-500">
                      {history.slice(0, 8).map((item) => (
                        <p key={item.id}>{String(item.lesson_date)}: {String(item.status)}</p>
                      ))}
                      {!history.length && <p>Истории пока нет</p>}
                    </div>
                  </details>
                </div>
                {missed >= 8 && <p className="rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700">8 пропусков подряд</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function JournalStatusButton({
  student,
  status,
  date,
  active,
  danger = false,
}: {
  student: RoboticsRow;
  status: "присутствовал" | "отсутствовал" | "опоздал";
  date: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={saveJournalAttendance}>
      <input type="hidden" name="studentName" value={fullName(student)} />
      <input type="hidden" name="groupName" value={String(student.group_name ?? "")} />
      <input type="hidden" name="mentorName" value={String(student.mentor_name ?? "")} />
      <input type="hidden" name="lessonDate" value={date} />
      <input type="hidden" name="status" value={status} />
      <button className={`w-full rounded-xl px-3 py-2 text-xs font-black transition ${
        active
          ? danger ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
          : danger ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "border border-slate-200 bg-white text-slate-800 hover:bg-emerald-50"
      }`}>
        {status === "присутствовал" ? "Был" : status === "опоздал" ? "Опоздал" : "Нет"}
      </button>
    </form>
  );
}

function GroupsPanel({
  groups,
  students,
  mentors,
  employees,
  lessons,
  payments,
  attendance,
}: {
  groups: RoboticsRow[];
  students: RoboticsRow[];
  mentors: RoboticsRow[];
  employees: RoboticsRow[];
  lessons: RoboticsRow[];
  payments: RoboticsRow[];
  attendance: RoboticsRow[];
}) {
  const mentorNames = unique([
    ...mentors.map((mentor) => String(mentor.name ?? "")).filter(Boolean),
    ...employees
      .filter((employee) => String(employee.position ?? "").toLowerCase().includes("mentor"))
      .map((employee) => String(employee.name ?? ""))
      .filter(Boolean),
  ]);

  return (
    <Card className="mt-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100"><Users className="h-3.5 w-3.5" /> Группы</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Профили групп и расписание</h2>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => {
          const groupName = String(group.name ?? "");
          const groupStudents = students.filter((student) => student.group_name === groupName);
          const groupLessons = lessons.filter((lesson) => lesson.group_name === groupName);
          const groupPayments = payments.filter((payment) => payment.group_name === groupName || groupStudents.some((student) => fullName(student) === payment.student_name));
          const groupAttendance = attendance.filter((item) => item.group_name === groupName);
          const availableStudents = students.filter((student) => student.group_name !== groupName);
          const unassigned = students.filter((student) => !student.group_name);

          return (
            <div key={group.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{groupName}</h3>
                  <p className="mt-1 text-sm text-slate-400">{String(group.course ?? "-")} • {String(group.level ?? "-")} • {String(group.room ?? "-")}</p>
                  <p className="mt-2 text-sm text-slate-300">{String(group.schedule_days ?? "-")} {String(group.start_time ?? "")}-{String(group.end_time ?? "")}</p>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
                  {groupStudents.length}/{Number(group.max_students ?? 0) || "-"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Ученики" value={groupStudents.length} />
                <MiniStat label="Уроки" value={groupLessons.length} />
                <MiniStat label="Оплаты" value={groupPayments.length} />
                <MiniStat label="Посещаемость" value={groupAttendance.length} />
              </div>

              <form action={saveRoboticsRecord} className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/30 p-4 md:grid-cols-[1fr_auto] md:items-end">
                <input type="hidden" name="module" value="groups" />
                <input type="hidden" name="id" value={group.id} />
                <input type="hidden" name="name" value={groupName} />
                <input type="hidden" name="course" value={String(group.course ?? "")} />
                <input type="hidden" name="age_range" value={String(group.age_range ?? "")} />
                <input type="hidden" name="level" value={String(group.level ?? "")} />
                <input type="hidden" name="room" value={String(group.room ?? "")} />
                <input type="hidden" name="max_students" value={String(group.max_students ?? 12)} />
                <input type="hidden" name="schedule_days" value={String(group.schedule_days ?? "")} />
                <input type="hidden" name="start_time" value={String(group.start_time ?? "")} />
                <input type="hidden" name="end_time" value={String(group.end_time ?? "")} />
                <input type="hidden" name="schedule_start_date" value={String(group.schedule_start_date ?? "")} />
                <input type="hidden" name="schedule_end_date" value={String(group.schedule_end_date ?? "")} />
                <input type="hidden" name="skip_holidays" value={String(group.skip_holidays ?? "no")} />
                <input type="hidden" name="status" value={String(group.status ?? "active")} />
                <input type="hidden" name="notes" value={String(group.notes ?? "")} />
                <input type="hidden" name="rating" value={String(group.rating ?? 0)} />
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Выбрать ментора</span>
                  <select name="mentor_name" defaultValue={String(group.mentor_name ?? "")} className="premium-input h-10 w-full px-3 text-sm text-white outline-none">
                    <option value="">Ментор не выбран</option>
                    {mentorNames.map((mentorName) => (
                      <option key={mentorName} value={mentorName}>{mentorName}</option>
                    ))}
                  </select>
                </label>
                <SmallButton>Сохранить ментора</SmallButton>
              </form>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><UserPlus className="h-3.5 w-3.5" /> Добавить из табеля</p>
                  <details open className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                    <summary className="cursor-pointer list-none text-sm font-black text-white">
                      Выбрать учеников ({availableStudents.length})
                    </summary>
                    <form action={assignStudentsToGroup} className="mt-3 grid gap-3">
                      <input type="hidden" name="groupName" value={groupName} />
                      <input type="hidden" name="mentorName" value={String(group.mentor_name ?? "")} />
                      <div className="max-h-72 space-y-2 overflow-auto pr-1">
                        {!availableStudents.length && <p className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-slate-400">Все ученики уже находятся в этой группе.</p>}
                        {availableStudents.map((student) => {
                          const currentGroup = String(student.group_name ?? "");
                          return (
                            <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-sm transition hover:border-cyan-300/25 hover:bg-cyan-300/10">
                              <input name="studentId" type="checkbox" value={student.id} className="h-4 w-4 accent-cyan-300" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-black text-white">{fullName(student)}</span>
                                <span className="mt-1 block truncate text-xs text-slate-500">
                                  {currentGroup ? `Сейчас: ${currentGroup}` : "Без группы"} • {String(student.parent_phone ?? "Телефон не указан")}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <SmallButton>Добавить выбранных</SmallButton>
                    </form>
                  </details>
                  {!!unassigned.length && (
                    <form action={assignStudentToGroup} className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                      <input type="hidden" name="groupName" value={groupName} />
                      <input type="hidden" name="mentorName" value={String(group.mentor_name ?? "")} />
                      <select name="studentId" className="premium-input h-10 px-3 text-sm text-white outline-none">
                        <option value="">Быстро добавить одного ученика</option>
                        {unassigned.map((student) => (
                          <option key={student.id} value={student.id}>{fullName(student)}</option>
                        ))}
                      </select>
                      <SmallButton>Добавить одного</SmallButton>
                    </form>
                  )}
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ученики в группе</p>
                    {groupStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200">
                        <span>{fullName(student)}</span>
                        <form action={removeStudentFromGroup}>
                          <input type="hidden" name="studentId" value={student.id} />
                          <SmallButton danger>Убрать</SmallButton>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Автоуроки</p>
                  <form action={createLessonsFromGroupSchedule} className="grid gap-2">
                    <input type="hidden" name="groupId" value={group.id} />
                    <input name="topic" placeholder="Тема урока" className="premium-input h-10 px-3 text-sm text-white outline-none" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input name="startDate" type="date" defaultValue={String(group.schedule_start_date ?? "")} className="premium-input h-10 px-3 text-sm text-white outline-none" />
                      <input name="endDate" type="date" defaultValue={String(group.schedule_end_date ?? "")} className="premium-input h-10 px-3 text-sm text-white outline-none" />
                    </div>
                    <SmallButton>Создать уроки</SmallButton>
                  </form>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Дни пишите через запятую: Monday, Wednesday или Понедельник, Среда.</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CalendarPanel({
  rows,
  students,
  attendance,
  params,
}: {
  rows: RoboticsRow[];
  students: RoboticsRow[];
  attendance: RoboticsRow[];
  params: { view?: "day" | "week" | "month"; q?: string; status?: string; group?: string; mentor?: string; room?: string; sort?: string; order?: "asc" | "desc" };
}) {
  const view = params.view ?? "week";
  const grouped = rows.reduce<Record<string, RoboticsRow[]>>((acc, row) => {
    const key = String(row.lesson_date ?? "Без даты");
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});

  return (
    <Card className="mt-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100"><CalendarDays className="h-3.5 w-3.5" /> Календарь</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Уроки, пробные занятия и события</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as const).map((item) => (
            <a key={item} href={calendarHref(params, item)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${view === item ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"}`}>
              {item === "day" ? "День" : item === "week" ? "Неделя" : "Месяц"}
            </a>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${view === "day" ? "" : view === "week" ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
        {Object.entries(grouped).map(([date, events]) => (
          <div key={date} className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-slate-400">{date}</h3>
            <div className="space-y-3">
              {events.map((event) => {
                const eventStudents = students.filter((student) => student.group_name === event.group_name);
                const eventAttendance = attendance.filter((item) => item.lesson_id === event.id);
                return (
                  <details key={event.id} className={event.status === "cancelled" ? "rounded-2xl border border-red-300/20 bg-red-500/10 p-4" : "rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4"}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-white">{String(event.group_name ?? event.student_name ?? event.topic ?? "Событие")}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                            <Clock className="h-3.5 w-3.5" />
                            {String(event.lesson_time ?? "-")}{event.lesson_end_time ? `-${String(event.lesson_end_time)}` : ""}
                            <span>• {String(event.mentor_name ?? "-")}</span>
                            <span>• {String(event.room ?? "-")}</span>
                            <span>• {eventStudents.length} учеников</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">{String(event.event_type ?? "group")}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{String(event.topic ?? "")}</p>
                    </summary>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Посещаемость урока</p>
                      {!eventStudents.length && <p className="text-sm text-slate-400">В этой группе пока нет учеников.</p>}
                      {!!eventStudents.length && (
                        <form action={saveLessonAttendance} className="space-y-3">
                          <input type="hidden" name="lessonId" value={event.id} />
                          <input type="hidden" name="lessonDate" value={String(event.lesson_date ?? "")} />
                          <input type="hidden" name="groupName" value={String(event.group_name ?? "")} />
                          <input type="hidden" name="mentorName" value={String(event.mentor_name ?? "")} />
                          {eventStudents.map((student) => {
                            const name = fullName(student);
                            const current = eventAttendance.find((item) => item.student_name === name);
                            const missed = missedLessonsCount(attendance, name);
                            return (
                              <div key={student.id} className={`grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_180px_1fr] ${missed >= 8 ? "border-red-300/30 bg-red-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                                <input type="hidden" name="studentName" value={name} />
                                <div>
                                  <p className="font-bold text-white">{name}</p>
                                  {missed >= 8 && <p className="mt-1 text-xs font-semibold text-red-200">8+ пропусков подряд. Нужен контакт с родителем.</p>}
                                </div>
                                <select name={`status:${name}`} defaultValue={String(current?.status ?? "присутствовал")} className="premium-input h-10 px-3 text-sm text-white outline-none">
                                  <option value="присутствовал">присутствовал</option>
                                  <option value="отсутствовал">отсутствовал</option>
                                  <option value="опоздал">опоздал</option>
                                </select>
                                <input name={`comment:${name}`} defaultValue={String(current?.comment ?? "")} placeholder="Комментарий" className="premium-input h-10 px-3 text-sm text-white outline-none" />
                              </div>
                            );
                          })}
                          <SmallButton>Сохранить посещаемость</SmallButton>
                        </form>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!rows.length && <EmptyState text="В календаре пока нет уроков. Создайте урок вручную или сгенерируйте из расписания группы." />}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniReportBox({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{note}</p>
    </div>
  );
}

function averageScore(rows: RoboticsRow[]) {
  if (!rows.length) return "0";
  const average = rows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / rows.length;
  return average.toFixed(1);
}

function uniqueByStudent(rows: RoboticsRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const name = String(row.student_name ?? "");
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function findStudentByName(students: RoboticsRow[], name: string) {
  return students.find((student) => fullName(student) === name || student.student_name === name);
}

function whatsappHref(student: RoboticsRow | undefined, message: string, fallbackHref: string) {
  const phone = String(student?.whatsapp ?? student?.parent_phone ?? student?.phone ?? "").replace(/\D/g, "");
  if (!phone) return fallbackHref;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function whatsappContact(student: RoboticsRow | undefined, message: string, fallbackHref: string) {
  const phone = String(student?.whatsapp ?? student?.parent_phone ?? student?.phone ?? "").replace(/\D/g, "");
  return {
    href: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : fallbackHref,
    hasPhone: Boolean(phone),
  };
}

function fullName(row: RoboticsRow) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || String(row.student_name ?? row.name ?? "-");
}

function statusShort(status: string) {
  if (status === "присутствовал") return "Б";
  if (status === "опоздал") return "О";
  if (status === "отсутствовал") return "Н";
  return status.slice(0, 1).toUpperCase();
}

function daysBetween(from: string, to: string) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 999;
  return Math.abs(end - start) / 86_400_000;
}

function missedLessonsCount(attendance: RoboticsRow[], studentName: string) {
  const rows = attendance
    .filter((item) => item.student_name === studentName)
    .sort((a, b) => String(b.lesson_date ?? "").localeCompare(String(a.lesson_date ?? "")));
  let missed = 0;
  for (const row of rows) {
    if (row.status !== "отсутствовал") break;
    missed += 1;
  }
  return missed;
}

function calendarHref(params: { q?: string; status?: string; group?: string; mentor?: string; room?: string; sort?: string; order?: "asc" | "desc" }, view: "day" | "week" | "month") {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.group) query.set("group", params.group);
  if (params.mentor) query.set("mentor", params.mentor);
  if (params.room) query.set("room", params.room);
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  query.set("view", view);
  return `?${query.toString()}`;
}

function sortHref(params: { q?: string; status?: string; group?: string; mentor?: string; room?: string; sort?: string; order?: "asc" | "desc" }, column: string) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.group) query.set("group", params.group);
  if (params.mentor) query.set("mentor", params.mentor);
  if (params.room) query.set("room", params.room);
  query.set("sort", column);
  query.set("order", params.sort === column && params.order !== "desc" ? "desc" : "asc");
  return `?${query.toString()}`;
}

function Notice({ text, tone }: { text: string; tone: "danger" | "success" }) {
  return (
    <p className={`mb-4 flex items-center gap-3 rounded-2xl border p-3 text-sm font-semibold ${
      tone === "danger" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
    }`}>
      <ShieldAlert className="h-4 w-4" />
      {text}
    </p>
  );
}

function MetricCard({ label, value, warning = false }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <Card className={warning ? "border-red-300/20" : ""}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-400">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-2xl border ${
          warning ? "border-red-300/20 bg-red-500/10 text-red-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
        }`}>
          <Sparkles className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
    </Card>
  );
}

function warningCount(moduleKey: RoboticsModuleKey, rows: RoboticsRow[]) {
  if (moduleKey === "subscriptions") return rows.filter((row) => Number(row.remaining_lessons ?? 0) <= 2).length;
  if (moduleKey === "attendance") return rows.filter((row) => row.status === "отсутствовал").length;
  if (moduleKey === "payments") return rows.filter((row) => row.status === "не оплачено" || row.status === "частично").length;
  return 0;
}

function isWarningRow(moduleKey: RoboticsModuleKey, row: RoboticsRow) {
  if (moduleKey === "subscriptions") return Number(row.remaining_lessons ?? 0) <= 2;
  if (moduleKey === "attendance") return row.status === "отсутствовал";
  if (moduleKey === "payments") return row.status === "не оплачено" || row.status === "частично";
  return false;
}

function ReportsPanel({
  locale,
  students,
  attendance,
  subscriptions,
  grades,
  lessons,
}: {
  locale: import("@/lib/i18n").Locale;
  students: RoboticsRow[];
  attendance: RoboticsRow[];
  subscriptions: RoboticsRow[];
  grades: RoboticsRow[];
  lessons: RoboticsRow[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const present = attendance.filter((item) => item.status === "присутствовал" || item.status === "опоздал").length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const absentToday = uniqueByStudent(attendance.filter((item) => item.lesson_date === today && item.status === "отсутствовал"));
  const studentsNeedPayment = students.filter((student) => {
    const name = fullName(student);
    const subscription = subscriptions.find((item) => item.student_name === name);
    return !subscription || Number(subscription.remaining_lessons ?? 0) <= 0;
  });
  const monthGrades = grades.filter((grade) => String(grade.grade_date ?? "").startsWith(month));
  const weekGrades = grades.filter((grade) => daysBetween(String(grade.grade_date ?? today), today) <= 7);
  const dayGrades = grades.filter((grade) => grade.grade_date === today);
  const allAverage = averageScore(grades);
  const monthAverage = averageScore(monthGrades);
  const weekAverage = averageScore(weekGrades);
  const dayAverage = averageScore(dayGrades);
  const todayLessons = lessons.filter((lesson) => lesson.lesson_date === today);
  const firstLessonTopic = String(todayLessons[0]?.topic ?? "Уроков сегодня нет");

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <details className={`group rounded-3xl border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
        absentToday.length ? "border-red-300/30 bg-red-500/10" : "border-white/10 bg-white/[0.04]"
      }`}>
        <summary className="relative cursor-pointer list-none">
          {!!absentToday.length && (
            <span className="absolute right-0 top-0 grid min-w-9 place-items-center rounded-full bg-red-500 px-3 py-1 text-sm font-black text-white shadow-[0_0_28px_rgba(239,68,68,0.45)]">
              {absentToday.length}
            </span>
          )}
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">{translateLiteral(locale, "Посещаемость")}</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white">{attendanceRate}%</h2>
          <p className="mt-2 text-sm text-slate-400">{present}/{attendance.length || 0} посещений отмечено</p>
          <p className="mt-5 text-sm font-semibold text-slate-300">Нажми, чтобы открыть список отсутствующих сегодня.</p>
        </summary>
        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          {!absentToday.length && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-100">Сегодня отсутствующих нет.</p>}
          {absentToday.map((record) => {
            const name = String(record.student_name ?? "-");
            const student = findStudentByName(students, name);
            const message = `Здравствуйте! Сегодня ${name} не был(а) на уроке. Подскажите, пожалуйста, причину отсутствия.`;

            return (
              <a
                key={record.id}
                href={whatsappHref(student, message, `/dashboard/education/attendance?q=${encodeURIComponent(name)}`)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm transition hover:bg-red-500/15"
              >
                <span>
                  <span className="block font-black text-white">{name}</span>
                  <span className="mt-1 block text-xs text-red-100/75">{String(record.group_name ?? "Без группы")} • {String(record.lesson_date ?? today)}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </span>
              </a>
            );
          })}
        </div>
      </details>

      <details className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-100">{translateLiteral(locale, "Оценка")}</p>
              <h2 className="mt-4 flex items-center gap-3 text-4xl font-black tracking-tight text-white">
                <Star className="h-8 w-8 fill-yellow-300 text-yellow-300" />
                {allAverage}
              </h2>
              <p className="mt-2 text-sm text-slate-400">Средний балл всех учеников.</p>
            </div>
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm font-black text-yellow-950">{dayGrades.length}</span>
          </div>
        </summary>

        <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
          <MiniReportBox label="Месяц" value={monthAverage} note={`${monthGrades.length} оценок`} />
          <MiniReportBox label="Неделя" value={weekAverage} note={`${weekGrades.length} оценок`} />
          <details className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-4 sm:col-span-3">
            <summary className="cursor-pointer list-none">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-yellow-100">День</p>
              <p className="mt-2 text-3xl font-black text-white">{dayAverage}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Нажми, чтобы открыть список учеников и поставить оценки.</p>
            </summary>

            <div className="mt-4 space-y-2">
              {students.map((student) => {
                const name = fullName(student);
                const grade = dayGrades.find((item) => item.student_name === name);
                return (
                  <form key={student.id} action={saveStudentGrade} className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/35 p-3 md:grid-cols-[1fr_110px_1fr_auto] md:items-center">
                    <input type="hidden" name="studentName" value={name} />
                    <input type="hidden" name="groupName" value={String(student.group_name ?? "")} />
                    <input type="hidden" name="mentorName" value={String(student.mentor_name ?? "")} />
                    <input type="hidden" name="gradeDate" value={today} />
                    <div>
                      <p className="font-black text-white">{name}</p>
                      <p className="text-xs text-slate-400">{String(student.group_name ?? "Без группы")} • {String(student.mentor_name ?? "Ментор не выбран")}</p>
                    </div>
                    <input
                      name="score"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={String(grade?.score ?? "")}
                      placeholder="0-100"
                      className="premium-input h-10 px-3 text-sm text-white outline-none"
                    />
                    <input
                      name="comment"
                      defaultValue={String(grade?.comment ?? "")}
                      placeholder="Комментарий ментора"
                      className="premium-input h-10 px-3 text-sm text-white outline-none"
                    />
                    <SmallButton><Star className="h-3.5 w-3.5" /> Оценить</SmallButton>
                  </form>
                );
              })}
              {!students.length && <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-slate-400">Сначала добавь учеников.</p>}
            </div>
          </details>
        </div>
      </details>

      <details className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">{translateLiteral(locale, "Темы уроков")}</p>
              <h2 className="mt-4 line-clamp-2 text-3xl font-black tracking-tight text-white">{firstLessonTopic}</h2>
              <p className="mt-2 text-sm text-slate-400">Сегодня: {todayLessons.length} уроков</p>
            </div>
            {!!todayLessons.length && <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-black text-emerald-950">{todayLessons.length}</span>}
          </div>
        </summary>

        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          {!todayLessons.length && (
            <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-slate-400">
              На сегодня уроков нет. Добавь урок в расписании или сгенерируй уроки из группы.
            </p>
          )}
          {todayLessons.map((lesson) => (
            <a
              key={lesson.id}
              href="/dashboard/education/schedule"
              className="block rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 transition hover:bg-emerald-400/15"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-black text-white">{String(lesson.topic ?? "Без темы")}</span>
                <span className="rounded-full bg-slate-950/45 px-3 py-1 text-xs font-black text-emerald-100">{String(lesson.lesson_time ?? "-")}</span>
              </span>
              <span className="mt-2 block text-xs font-semibold text-slate-400">
                {String(lesson.group_name ?? "Без группы")} • {String(lesson.mentor_name ?? "Ментор не выбран")} • {String(lesson.room ?? "Кабинет")}
              </span>
            </a>
          ))}
        </div>
      </details>

      <details className={`group rounded-3xl border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
        studentsNeedPayment.length ? "border-red-300/30 bg-red-500/10" : "border-white/10 bg-white/[0.04]"
      }`}>
        <summary className="relative cursor-pointer list-none">
          {!!studentsNeedPayment.length && (
            <span className="absolute right-0 top-0 grid min-w-9 place-items-center rounded-full bg-red-500 px-3 py-1 text-sm font-black text-white shadow-[0_0_28px_rgba(239,68,68,0.45)]">
              {studentsNeedPayment.length}
            </span>
          )}
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100">{translateLiteral(locale, "Оплата")}</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white">{studentsNeedPayment.length}</h2>
          <p className="mt-2 text-sm text-slate-400">Ученики, которым нужно оплатить.</p>
          <p className="mt-5 text-sm font-semibold text-slate-300">Нажми, чтобы открыть список оплат.</p>
        </summary>
        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          {!studentsNeedPayment.length && <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-100">Все ученики оплачены.</p>}
          {studentsNeedPayment.map((student) => {
            const name = fullName(student);
            const parentName = String(student.parent_name ?? "").trim();
            const message = parentName
              ? `Здравствуйте, ${parentName}! Напоминаем, что у ${name} закончилась оплата/абонемент. Пожалуйста, оплатите обучение.`
              : `Здравствуйте! Напоминаем, что у ${name} закончилась оплата/абонемент. Пожалуйста, оплатите обучение.`;
            const contact = whatsappContact(student, message, `/dashboard/education/payments?q=${encodeURIComponent(name)}`);

            return (
              <PaymentReminderLink
                key={student.id}
                studentId={student.id}
                studentName={name}
                groupName={String(student.group_name ?? "Без группы")}
                href={contact.href}
                hasPhone={contact.hasPhone}
              />
            );
          })}
        </div>
      </details>
    </div>
  );
}
