import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, GraduationCap, UserRoundCheck } from "lucide-react";
import { BrandLogo } from "@/components/app/brand-logo";
import { LanguageSwitcher } from "@/components/app/language-switcher";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3 text-lg font-black tracking-wide text-white">
            <BrandLogo className="h-10 w-10" />
            CRM.Space
          </Link>
          <LanguageSwitcher />
        </div>

        <section className="grid flex-1 place-items-center py-12">
          <div className="w-full">
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
              Registration
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Выберите тип аккаунта</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              После выбора откроется отдельная форма регистрации.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <SignupChoiceCard
                href="/signup/founder"
                title="Founder"
                description="Создать компанию и рабочее пространство."
                icon={<BriefcaseBusiness className="h-6 w-6" />}
              />
              <SignupChoiceCard
                href="/signup/employee"
                title="Employee"
                description="Запросить доступ к существующей компании."
                icon={<UserRoundCheck className="h-6 w-6" />}
              />
              <SignupChoiceCard
                href="/signup/mentor"
                title="Mentor"
                description="Запросить доступ как ментор/преподаватель."
                icon={<GraduationCap className="h-6 w-6" />}
              />
            </div>

            <p className="mt-6 text-sm text-slate-300">
              Уже есть аккаунт? <Link href="/login" className="font-bold text-cyan-100">Войти</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignupChoiceCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/[0.07]"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition group-hover:scale-105">
        {icon}
      </span>
      <h2 className="mt-5 text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 min-h-16 text-sm leading-6 text-slate-300">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-100">
        Открыть форму
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
