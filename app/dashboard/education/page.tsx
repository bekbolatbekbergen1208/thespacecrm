import Link from "next/link";
import { seedRoboticsDemoData } from "@/app/actions";
import { Card, PageHeader } from "@/components/app/app-shell";
import { RoboticsCharts } from "@/components/app/robotics-charts";
import { requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerDictionary, getServerLocale } from "@/lib/i18n-server";
import { roboticsModuleList } from "@/lib/robotics-crm";
import { Activity, ArrowRight, CalendarClock, Database, GraduationCap, Plus, TrendingUp } from "lucide-react";

export default async function EducationDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ supabase, membership }, params, t, locale] = await Promise.all([requireUser(), searchParams, getServerDictionary(), getServerLocale()]);
  const companyId = membership!.company_id;
  const [students, groups, mentors, payments, attendance, lessons, trials] = await Promise.all([
    supabase.from("robotics_students").select("id", { count: "exact" }).eq("company_id", companyId),
    supabase.from("robotics_groups").select("id", { count: "exact" }).eq("company_id", companyId),
    supabase.from("robotics_mentors").select("id", { count: "exact" }).eq("company_id", companyId),
    supabase.from("robotics_payments").select("amount, status, paid_at").eq("company_id", companyId),
    supabase.from("robotics_attendance").select("status").eq("company_id", companyId),
    supabase.from("robotics_lessons").select("id, lesson_time, group_name, room, mentor_name, topic").eq("company_id", companyId).order("lesson_date").limit(5),
    supabase.from("robotics_trial_lessons").select("id", { count: "exact" }).eq("company_id", companyId).eq("trial_date", new Date().toISOString().slice(0, 10)),
  ]);

  const totalRevenue = payments.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0;
  const monthRevenue = payments.data?.filter((payment) => String(payment.paid_at ?? "").startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0;
  const todayPayments = payments.data?.filter((payment) => payment.paid_at === new Date().toISOString().slice(0, 10)).length ?? 0;
  const debts = payments.data?.filter((payment) => payment.status !== "оплачено").length ?? 0;
  const attendanceRate = attendance.data?.length
    ? Math.round((attendance.data.filter((item) => item.status === "присутствовал").length / attendance.data.length) * 100)
    : 0;

  const cards = [
    [t.totalRevenue, `$${totalRevenue.toLocaleString()}`],
    [t.monthRevenue, `$${monthRevenue.toLocaleString()}`],
    [t.todayPayments, todayPayments],
    [t.debts, debts],
    [t.studentsCount, students.count ?? 0],
    [t.groupsCount, groups.count ?? 0],
    [t.mentorsCount, mentors.count ?? 0],
    [t.averageAttendance, `${attendanceRate}%`],
    [t.upcomingLessons, lessons.data?.length ?? 0],
    [t.trialToday, trials.count ?? 0],
  ];

  return (
    <>
      <PageHeader title={t.roboticsTitle} description={t.roboticsDesc} />
      {params.error && <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}

      <Card className="mb-5 p-0">
        <div className="grid gap-0 overflow-hidden lg:grid-cols-[1fr_360px]">
          <div className="p-6 sm:p-8">
            <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
              {translateLiteral(locale, "Robotics Education OS")}
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              {t.roboticsHero}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              {t.roboticsHeroDesc}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/dashboard/education/students" className="premium-button h-11 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
                <Plus className="h-4 w-4" />
                {t.addStudent}
              </Link>
              <Link href="/dashboard/education/schedule" className="premium-button h-11 border border-white/10 bg-white/[0.045] px-5 text-sm text-slate-200 hover:bg-white/[0.08]">
                <CalendarClock className="h-4 w-4" />
                {t.schedule}
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 bg-slate-950/[0.35] p-6 lg:border-l lg:border-t-0">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
              <Activity className="h-4 w-4 text-cyan-100" />
              {t.activityTimeline}
            </h3>
            <div className="mt-5 space-y-4">
              {[
                [t.today, `${todayPayments} ${t.todayPayments}`],
                [t.students, `${students.count ?? 0} ${t.studentsCount}`],
                [t.attendance, `${attendanceRate}% ${t.averageAttendance}`],
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value], index) => (
          <Card key={String(label)} className="soft-pop">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-400">{label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-2xl border ${
                index % 3 === 0 ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : index % 3 === 1 ? "border-violet-300/20 bg-violet-300/10 text-violet-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              }`}>
                {index % 3 === 0 ? <TrendingUp className="h-4 w-4" /> : index % 3 === 1 ? <GraduationCap className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <RoboticsCharts locale={locale} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roboticsModuleList.filter((module) => module.key !== "settings").map((module) => (
          <Link key={module.key} href={module.href} className="group">
            <Card className="h-full">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-black tracking-tight">{translateLiteral(locale, module.title)}</h2>
                <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-slate-400 transition group-hover:border-cyan-300/30 group-hover:text-cyan-100">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{translateLiteral(locale, module.description)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
