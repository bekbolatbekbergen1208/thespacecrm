import Link from "next/link";
import { seedRoboticsDemoData } from "@/app/actions";
import { Card, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerDictionary, getServerLocale } from "@/lib/i18n-server";
import { roboticsModuleList } from "@/lib/robotics-crm";
import { Activity, ArrowRight, CalendarClock, ChevronDown, ClipboardCheck, CreditCard, Database, GraduationCap, Plus, UsersRound } from "lucide-react";

export default async function EducationDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ supabase, membership }, params, t, locale] = await Promise.all([requireUser(), searchParams, getServerDictionary(), getServerLocale()]);
  const companyId = membership!.company_id;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const [students, groups, payments, attendance, lessons, trials] = await Promise.all([
    supabase.from("robotics_students").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("robotics_groups").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase
      .from("robotics_payments")
      .select("amount, status, paid_at")
      .eq("company_id", companyId)
      .gte("paid_at", `${month}-01`)
      .limit(500),
    supabase.from("robotics_attendance").select("status").eq("company_id", companyId).order("lesson_date", { ascending: false }).limit(500),
    supabase.from("robotics_lessons").select("id, lesson_time, group_name, room, mentor_name, topic").eq("company_id", companyId).gte("lesson_date", today).order("lesson_date").limit(5),
    supabase.from("robotics_trial_lessons").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("trial_date", today),
  ]);

  const todayPayments = payments.data?.filter((payment) => payment.paid_at === today).length ?? 0;
  const debts = payments.data?.filter((payment) => payment.status !== "оплачено").length ?? 0;
  const attendanceRate = attendance.data?.length
    ? Math.round((attendance.data.filter((item) => item.status === "присутствовал").length / attendance.data.length) * 100)
    : 0;

  const simpleCards = [
    [t.studentsCount, students.count ?? 0, "Всего учеников", GraduationCap],
    [t.groupsCount, groups.count ?? 0, "Активные группы", UsersRound],
    [t.averageAttendance, `${attendanceRate}%`, "Средняя посещаемость", ClipboardCheck],
    [t.upcomingLessons, lessons.data?.length ?? 0, "Ближайшие уроки", CalendarClock],
    [t.todayPayments, todayPayments, "Оплаты сегодня", CreditCard],
    [t.debts, debts, "Нужно проверить", Activity],
  ] as const;
  const quickActions = [
    ["Добавить ученика", "/dashboard/education/students", Plus],
    ["Открыть группы", "/dashboard/education/groups", UsersRound],
    ["Расписание", "/dashboard/education/schedule", CalendarClock],
    ["Посещаемость", "/dashboard/education/attendance", ClipboardCheck],
    ["Оплаты", "/dashboard/education/payments", CreditCard],
    ["Пробные уроки", "/dashboard/education/trial-lessons", GraduationCap],
  ] as const;
  const coreHrefs = new Set<string>([
    ...quickActions.map(([, href]) => href),
    "/dashboard/education/reports",
    "/dashboard/education/mentor-journal",
  ]);
  const extraModules = roboticsModuleList.filter((module) => !coreHrefs.has(module.href) && module.key !== "settings");

  return (
    <>
      <PageHeader title={t.roboticsTitle} description={t.roboticsDesc} />
      {params.error && <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}

      <Card className="mb-5 p-0">
        <div className="grid gap-0 overflow-hidden lg:grid-cols-[1fr_320px]">
          <div className="p-6 sm:p-8">
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100">
              {translateLiteral(locale, "Education CRM")}
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Простая панель учебного центра
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Самые важные действия собраны здесь: ученики, группы, расписание, посещаемость, оплаты и пробные уроки.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map(([label, href, Icon], index) => (
                <Link key={href} href={href} className={`premium-button h-11 justify-start px-4 text-sm ${
                  index === 0
                    ? "bg-white text-slate-950 shadow-glow hover:bg-cyan-50"
                    : "border border-white/10 bg-white/[0.045] text-slate-200 hover:bg-white/[0.08]"
                }`}>
                  <Icon className="h-4 w-4" />
                  {translateLiteral(locale, label)}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 bg-slate-950/[0.35] p-6 lg:border-l lg:border-t-0">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
              <Activity className="h-4 w-4 text-cyan-100" />
              {t.activityTimeline}
            </h3>
            <div className="mt-5 space-y-4">
              {[
                ["Сегодня", `${todayPayments} оплат, ${lessons.data?.length ?? 0} уроков, ${trials.count ?? 0} пробных`],
                ["Ученики", `${students.count ?? 0} учеников`],
                ["Посещаемость", `${attendanceRate}% средний показатель`],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.55)]" />
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
                    <span className="mt-1 block text-sm text-slate-200">{value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <form action={seedRoboticsDemoData}>
          <button className="premium-button h-10 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
            <Database className="h-4 w-4" />
            {t.seedDemo}
          </button>
        </form>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {simpleCards.map(([label, value, note, Icon], index) => (
          <Card key={String(label)} className="soft-pop">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-400">{label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-2xl border ${
                index % 3 === 0 ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : index % 3 === 1 ? "border-violet-300/20 bg-violet-300/10 text-violet-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              }`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{note}</p>
          </Card>
        ))}
      </div>
      <details className="group mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span>
            <span className="block text-lg font-black text-white">Дополнительные функции</span>
            <span className="mt-1 block text-sm text-slate-400">Абонементы, менторы, договоры, задачи, инвентарь и остальные модули.</span>
          </span>
          <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {extraModules.map((module) => (
            <Link key={module.key} href={module.href} className="group/link rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-black tracking-tight text-white">{translateLiteral(locale, module.title)}</h2>
                <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover/link:text-cyan-100" />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{translateLiteral(locale, module.description)}</p>
            </Link>
          ))}
        </div>
      </details>
    </>
  );
}
