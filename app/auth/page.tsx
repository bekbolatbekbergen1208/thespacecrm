import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/app/brand-logo";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { formatAuthError } from "@/lib/auth-errors";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const error = formatAuthError(params.error);

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
          <div className="w-full max-w-4xl">
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
              Secure workspace
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
              Выберите действие
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Сначала выберите регистрацию или вход. Формы откроются на отдельных страницах, чтобы экран был простым и быстрым.
            </p>

            {(error || params.message) && (
              <div className="mt-6 grid gap-3">
                {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{error}</p>}
                {params.message && <p className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm font-semibold text-cyan-100">{params.message}</p>}
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <AuthChoiceCard
                href="/signup"
                title="Регистрация"
                description="Создать новый аккаунт: founder, employee или mentor."
                icon={<UserPlus className="h-6 w-6" />}
                cta="Открыть регистрацию"
                primary
              />
              <AuthChoiceCard
                href="/login"
                title="Вход"
                description="Войти в уже созданный аккаунт CRM.Space."
                icon={<LogIn className="h-6 w-6" />}
                cta="Открыть вход"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthChoiceCard({
  href,
  title,
  description,
  icon,
  cta,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-[28px] border p-6 shadow-soft transition hover:-translate-y-0.5 ${
        primary
          ? "border-cyan-300/30 bg-cyan-300/[0.08] hover:bg-cyan-300/[0.12]"
          : "border-white/10 bg-white/[0.045] hover:border-cyan-300/25 hover:bg-white/[0.06]"
      }`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition group-hover:scale-105">
        {icon}
      </span>
      <h2 className="mt-5 text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-300">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-100">
        {cta}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
