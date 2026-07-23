import Link from "next/link";
import { saveMentorLessonSession } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { SmallButton } from "@/components/app/forms";
import { PrintButton } from "@/components/app/print-button";
import { canManage, requireUser } from "@/lib/auth";
import { BookOpenCheck, CalendarDays, ClipboardList, Star, Users } from "lucide-react";

type Row = {
  id: string;
  [key: string]: string | number | null;
};

export default async function MentorWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; error?: string; saved?: string; from?: string; to?: string; mentor?: string }>;
}) {
  const [{ supabase, membership, user }, params] = await Promise.all([requireUser(), searchParams]);
  const companyId = membership!.company_id;
  const company = Array.isArray(membership!.companies) ? membership!.companies[0] : membership!.companies;
  const today = new Date().toISOString().slice(0, 10);
  const periodFrom = isDateInput(params.from) ? String(params.from) : monthStart(today);
  const periodTo = isDateInput(params.to) ? String(params.to) : today;
  const printDays = dateRangeDays(periodFrom, periodTo, 31);

  const [{ data: profile }, { data: employee }, { data: groups }, { data: students }, { data: lessons }, { data: attendance }, { data: grades }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("employees").select("name, position").eq("company_id", companyId).eq("user_id", user.id).maybeSingle(),
    supabase.from("robotics_groups").select("*").eq("company_id", companyId).order("name", { ascending: true }),
    supabase.from("robotics_students").select("*").eq("company_id", companyId).order("first_name", { ascending: true }),
    supabase.from("robotics_lessons").select("*").eq("company_id", companyId).eq("lesson_date", today),
    supabase.from("robotics_attendance").select("*").eq("company_id", companyId).gte("lesson_date", periodFrom).lte("lesson_date", periodTo).order("lesson_date", { ascending: true }),
    supabase.from("robotics_grades").select("*").eq("company_id", companyId).eq("grade_date", today),
  ]);

  const mentorName = employee?.name ?? profile?.full_name ?? user.email ?? "Mentor";
  const aliases = [mentorName, profile?.full_name, employee?.name]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const canSeeAllGroups = canManage(membership!.role);
  const allGroups = (groups ?? []) as Row[];
  const allMentorNames = Array.from(
    new Set(allGroups.map((group) => String(group.mentor_name ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ru"));
  const selectedPrintMentor = canSeeAllGroups && params.mentor ? params.mentor : "";
  const visibleGroups = canSeeAllGroups
    ? allGroups
    : allGroups.filter((group) => aliases.some((alias) => String(group.mentor_name ?? "").toLowerCase().includes(alias)));
  const selectedGroup = visibleGroups.find((group) => group.id === params.group) ?? visibleGroups[0];
  const groupStudents = selectedGroup
    ? ((students ?? []) as Row[]).filter((student) => String(student.group_name ?? "") === String(selectedGroup.name ?? ""))
    : [];
  const todaysLesson = selectedGroup
    ? ((lessons ?? []) as Row[]).find((lesson) => String(lesson.source_group_id ?? "") === selectedGroup.id || String(lesson.group_name ?? "") === String(selectedGroup.name ?? ""))
    : null;
  const periodAttendance = (attendance ?? []) as Row[];
  const todayAttendance = periodAttendance.filter((item) => String(item.lesson_date ?? "") === today);
  const todayGrades = (grades ?? []) as Row[];
  const printableGroups = visibleGroups
    .filter((group) => !selectedPrintMentor || String(group.mentor_name ?? "") === selectedPrintMentor)
    .map((group) => {
    const groupName = String(group.name ?? "");
    const rows = ((students ?? []) as Row[]).filter((student) => String(student.group_name ?? "") === groupName);
    return { group, students: rows };
  });

  return (
    <>
      <PrintButton label="Печать журнала" floating />

      <PageHeader
        title="Кабинет ментора"
        description="Группы, тема урока, посещаемость и оценки учеников на сегодня."
      />
      {params.error && <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}
      {params.saved && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">Урок сохранён: тема, посещаемость и оценки обновлены.</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-400">Ментор</p>
          <p className="mt-2 text-2xl font-black text-white">{mentorName}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-400">Группы</p>
          <p className="mt-2 text-2xl font-black text-white">{visibleGroups.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-400">Сегодня</p>
          <p className="mt-2 text-2xl font-black text-white">{today}</p>
        </Card>
      </div>

      <section className="print-area mb-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-glow">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Журнал ментора</p>
            <h2 className="mt-2 text-3xl font-black text-white">Печатный журнал посещаемости</h2>
            <p className="mt-2 text-sm text-slate-400">{String(company?.name ?? "CRM.Space")} · {selectedPrintMentor || mentorName} · {periodFrom} - {periodTo}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Link href="/dashboard/education/groups" className="premium-button h-11 border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 hover:bg-white/[0.08]">
              Группы
            </Link>
            <PrintButton label="Печать сейчас" />
          </div>
        </div>

        <form className="no-print mb-5 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/35 p-4 lg:grid-cols-[1fr_1fr_1.3fr_auto] lg:items-end">
          <input type="hidden" name="group" value={String(params.group ?? "")} />
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Начало периода</span>
            <input name="from" type="date" defaultValue={periodFrom} className="premium-input h-11 w-full px-3 text-sm text-white outline-none" />
          </label>
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Конец периода</span>
            <input name="to" type="date" defaultValue={periodTo} className="premium-input h-11 w-full px-3 text-sm text-white outline-none" />
          </label>
          {canSeeAllGroups ? (
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ментор для печати</span>
              <select name="mentor" defaultValue={selectedPrintMentor} className="premium-input h-11 w-full px-3 text-sm text-white outline-none">
                <option value="">Все менторы</option>
                {allMentorNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="mentor" value="" />
          )}
          <button className="premium-button h-11 justify-center border border-cyan-300/20 bg-cyan-300/10 px-4 text-sm text-cyan-100">
            Обновить журнал
          </button>
        </form>

        <div className="mentor-print-cover mb-5 grid gap-3 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4 md:grid-cols-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Компания</p>
            <p className="mt-1 font-black text-white">{String(company?.name ?? "CRM.Space")}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ментор</p>
            <p className="mt-1 font-black text-white">{selectedPrintMentor || (canSeeAllGroups ? "Все менторы" : mentorName)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Период</p>
            <p className="mt-1 font-black text-white">{periodFrom} - {periodTo}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Дней / групп</p>
            <p className="mt-1 font-black text-white">{printDays.length} / {printableGroups.length}</p>
          </div>
        </div>

        <div className="grid gap-5">
          {!printableGroups.length && <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-slate-400">Нет групп для печати.</p>}
          {printableGroups.map(({ group, students: groupRows }) => {
            const printableRows = withBlankJournalRows(groupRows, 22);

            return (
            <div key={group.id} className="mentor-print-group overflow-hidden rounded-3xl border border-white/10 bg-slate-950/35">
              <div className="mentor-print-head border-b border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">CRM.Space · журнал посещаемости</p>
                    <h3 className="mt-1 text-2xl font-black text-white">{String(group.name ?? "Группа")}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {String(company?.name ?? "CRM.Space")} · {String(group.course ?? "Курс")} · кабинет {String(group.room ?? "-")} · {String(group.start_time ?? "--:--")} - {String(group.end_time ?? "--:--")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-black text-cyan-100">{periodFrom} - {periodTo}</p>
                    <p className="mt-1 text-xs text-slate-500">Ментор: {String(group.mentor_name ?? selectedPrintMentor ?? mentorName)}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-300 sm:grid-cols-4">
                  <span className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">Ученики: {groupRows.length}</span>
                  <span className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">Дней: {printDays.length}</span>
                  <span className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">Пустые строки: {printableRows.length - groupRows.length}</span>
                  <span className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">Б / НБ / О / У</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="mentor-print-table min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-slate-500">
                      <th className="w-12 px-4 py-3">№</th>
                      <th className="px-4 py-3">Имя ученика</th>
                      {printDays.map((day) => (
                        <th key={day.iso} className="mentor-print-day px-2 py-3 text-center">{day.label}</th>
                      ))}
                      <th className="px-4 py-3">Оценка</th>
                      <th className="px-4 py-3">Комментарий</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {!groupRows.length && (
                      <tr>
                        <td colSpan={printDays.length + 4} className="px-4 py-5 text-center text-slate-500">В этой группе пока нет учеников. Ниже оставлены пустые строки для заполнения.</td>
                      </tr>
                    )}
                    {printableRows.map((student, index) => {
                      const name = fullName(student);
                      const isBlank = Boolean(student.__blank);
                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-3 font-black text-slate-400">{index + 1}</td>
                          <td className="px-4 py-3 font-black text-white">{isBlank ? <span className="print-wide-line" /> : name}</td>
                          {printDays.map((day) => {
                            const mark = periodAttendance.find(
                              (item) =>
                                !isBlank &&
                                String(item.student_name ?? "") === name &&
                                String(item.group_name ?? "") === String(group.name ?? "") &&
                                String(item.lesson_date ?? "") === day.iso,
                            );
                            return (
                              <td key={day.iso} className="mentor-print-day px-2 py-3 text-center font-black">
                                {attendanceMark(String(mark?.status ?? ""))}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3"><span className="print-line" /></td>
                          <td className="px-4 py-3"><span className="print-wide-line" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mentor-print-signature grid gap-3 border-t border-white/10 px-4 py-4 text-sm text-slate-400 md:grid-cols-4">
                <p>Итог месяца: <span className="print-sign-line" /></p>
                <p>Подпись ментора: <span className="print-sign-line" /></p>
                <p>Подпись администратора: <span className="print-sign-line" /></p>
                <p>Дата проверки: <span className="print-sign-line" /></p>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          {!visibleGroups.length && (
            <EmptyState text="Пока нет групп, назначенных этому ментору. Founder/Admin должен указать имя ментора в группе." />
          )}
          {visibleGroups.map((group) => {
            const count = ((students ?? []) as Row[]).filter((student) => String(student.group_name ?? "") === String(group.name ?? "")).length;
            const active = selectedGroup?.id === group.id;
            return (
              <Link
                key={group.id}
                href={`/dashboard/mentor?group=${group.id}`}
                className={`block rounded-3xl border p-5 transition hover:scale-[1.01] ${
                  active ? "border-cyan-300/35 bg-cyan-300/10 shadow-glow" : "border-white/10 bg-white/[0.04] hover:border-cyan-300/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Группа</p>
                    <h2 className="mt-3 text-xl font-black text-white">{String(group.name ?? "Без названия")}</h2>
                    <p className="mt-2 text-sm text-slate-400">{String(group.course ?? "Курс")} • {String(group.room ?? "Кабинет")}</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                    <Users className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
                  <span className="rounded-2xl bg-slate-950/40 px-3 py-2">{count} учеников</span>
                  <span className="rounded-2xl bg-slate-950/40 px-3 py-2">{String(group.start_time ?? "--:--")}</span>
                </div>
              </Link>
            );
          })}
        </section>

        <section>
          {!selectedGroup && <EmptyState text="Выберите группу, чтобы открыть журнал урока." />}
          {selectedGroup && (
            <Card>
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-100">
                    <BookOpenCheck className="h-3.5 w-3.5" />
                    Урок группы
                  </p>
                  <h2 className="mt-4 text-3xl font-black text-white">{String(selectedGroup.name ?? "Группа")}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {String(selectedGroup.course ?? "Курс")} • {String(selectedGroup.mentor_name ?? mentorName)} • {String(selectedGroup.room ?? "Кабинет")}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                  <span className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2"><CalendarDays className="mr-2 inline h-4 w-4 text-cyan-100" />{today}</span>
                  <span className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2">{String(selectedGroup.start_time ?? "10:00")}</span>
                  <span className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2">{groupStudents.length} учеников</span>
                </div>
              </div>

              <form action={saveMentorLessonSession} className="space-y-5">
                <input type="hidden" name="groupId" value={selectedGroup.id} />
                <input type="hidden" name="groupName" value={String(selectedGroup.name ?? "")} />
                <input type="hidden" name="mentorName" value={String(selectedGroup.mentor_name ?? mentorName)} />
                <input type="hidden" name="lessonTime" value={String(selectedGroup.start_time ?? "10:00")} />
                <input type="hidden" name="lessonEndTime" value={String(selectedGroup.end_time ?? "")} />
                <input type="hidden" name="room" value={String(selectedGroup.room ?? "")} />

                <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Дата</span>
                    <input name="lessonDate" type="date" defaultValue={today} className="premium-input h-12 w-full px-4 text-sm text-white outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Общая тема урока</span>
                    <input name="topic" defaultValue={String(todaysLesson?.topic ?? "")} placeholder="Например: Датчики, циклы и движение робота" className="premium-input h-12 w-full px-4 text-sm text-white outline-none" />
                  </label>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <div className="grid gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 lg:grid-cols-[1.2fr_170px_120px_1fr]">
                    <span>Ученик</span>
                    <span>Посещаемость</span>
                    <span>Оценка</span>
                    <span>Комментарий</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {!groupStudents.length && <div className="p-5 text-sm text-slate-400">В этой группе пока нет учеников.</div>}
                    {groupStudents.map((student) => {
                      const name = fullName(student);
                      const currentAttendance = todayAttendance.find((item) => String(item.student_name ?? "") === name && String(item.group_name ?? "") === String(selectedGroup.name ?? ""));
                      const currentGrade = todayGrades.find((item) => String(item.student_name ?? "") === name && String(item.group_name ?? "") === String(selectedGroup.name ?? ""));
                      return (
                        <div key={student.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.2fr_170px_120px_1fr] lg:items-center">
                          <input type="hidden" name="studentName" value={name} />
                          <div>
                            <p className="font-black text-white">{name}</p>
                            <p className="mt-1 text-xs text-slate-500">{String(student.parent_name ?? "Родитель")} • {String(student.parent_phone ?? "Телефон")}</p>
                          </div>
                          <select name={`status:${name}`} defaultValue={String(currentAttendance?.status ?? "присутствовал")} className="premium-input h-11 px-3 text-sm text-white outline-none">
                            <option value="присутствовал">Был</option>
                            <option value="опоздал">Опоздал</option>
                            <option value="отсутствовал">Не был</option>
                            <option value="уважительный">Уважительный</option>
                          </select>
                          <input
                            name={`score:${name}`}
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={String(currentGrade?.score ?? "")}
                            placeholder="0-100"
                            className="premium-input h-11 px-3 text-sm text-white outline-none"
                          />
                          <div className="grid gap-2">
                            <input name={`comment:${name}`} defaultValue={String(currentAttendance?.comment ?? "")} placeholder="Комментарий посещаемости" className="premium-input h-10 px-3 text-sm text-white outline-none" />
                            <input name={`gradeComment:${name}`} defaultValue={String(currentGrade?.comment ?? "")} placeholder="Комментарий оценки" className="premium-input h-10 px-3 text-sm text-white outline-none" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                    <ClipboardList className="h-4 w-4 text-cyan-100" />
                    Сохраняется тема урока, посещаемость и оценки.
                  </p>
                  <SmallButton>
                    <Star className="h-4 w-4" />
                    Сохранить урок
                  </SmallButton>
                </div>
              </form>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}

function fullName(row: Row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || String(row.student_name ?? row.name ?? "-");
}

function withBlankJournalRows(rows: Row[], minimumRows: number) {
  const blanksNeeded = Math.max(6, minimumRows - rows.length);
  const blankRows = Array.from({ length: blanksNeeded }, (_, index) => ({
    id: `blank-${index}`,
    __blank: "true",
  }));

  return [...rows, ...blankRows];
}

function isDateInput(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function monthStart(today: string) {
  return `${today.slice(0, 8)}01`;
}

function dateRangeDays(from: string, to: string, limit: number) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const safeEnd = Number.isNaN(end.getTime()) || end < safeStart ? safeStart : end;
  const days: Array<{ iso: string; label: string }> = [];
  const cursor = new Date(safeStart);

  while (cursor <= safeEnd && days.length < limit) {
    const iso = cursor.toISOString().slice(0, 10);
    days.push({ iso, label: iso.slice(8, 10) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function attendanceMark(status: string) {
  if (status === "присутствовал") return "Б";
  if (status === "отсутствовал") return "НБ";
  if (status === "опоздал") return "О";
  if (status === "уважительный") return "У";
  return "";
}
