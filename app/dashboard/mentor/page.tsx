import Link from "next/link";
import { saveMentorLessonSession } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { SmallButton } from "@/components/app/forms";
import { canManage, requireUser } from "@/lib/auth";
import { BookOpenCheck, CalendarDays, ClipboardList, Star, Users } from "lucide-react";

type Row = {
  id: string;
  [key: string]: string | number | null;
};

export default async function MentorWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; error?: string; saved?: string }>;
}) {
  const [{ supabase, membership, user }, params] = await Promise.all([requireUser(), searchParams]);
  const companyId = membership!.company_id;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: employee }, { data: groups }, { data: students }, { data: lessons }, { data: attendance }, { data: grades }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("employees").select("name, position").eq("company_id", companyId).eq("user_id", user.id).maybeSingle(),
    supabase.from("robotics_groups").select("*").eq("company_id", companyId).order("name", { ascending: true }),
    supabase.from("robotics_students").select("*").eq("company_id", companyId).order("first_name", { ascending: true }),
    supabase.from("robotics_lessons").select("*").eq("company_id", companyId).eq("lesson_date", today),
    supabase.from("robotics_attendance").select("*").eq("company_id", companyId).eq("lesson_date", today),
    supabase.from("robotics_grades").select("*").eq("company_id", companyId).eq("grade_date", today),
  ]);

  const mentorName = employee?.name ?? profile?.full_name ?? user.email ?? "Mentor";
  const aliases = [mentorName, profile?.full_name, employee?.name]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const canSeeAllGroups = canManage(membership!.role);
  const allGroups = (groups ?? []) as Row[];
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
  const todayAttendance = (attendance ?? []) as Row[];
  const todayGrades = (grades ?? []) as Row[];

  return (
    <>
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
