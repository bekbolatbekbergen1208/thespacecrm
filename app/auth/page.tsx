import Link from "next/link";
import { createAccount, login } from "@/app/actions";
import { Field, SubmitButton } from "@/components/app/auth-card";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { formatAuthError } from "@/lib/auth-errors";
import { getServerDictionary } from "@/lib/i18n-server";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [params, t] = await Promise.all([searchParams, getServerDictionary()]);
  const error = formatAuthError(params.error);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="flex min-h-[calc(100vh-5rem)] flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-black tracking-wide text-white">CRM.Space</Link>
            <LanguageSwitcher />
          </div>
          <h1 className="mt-10 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">{t.createAccountOrSignIn}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            {t.authSubtitle}
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            <a href="#create-account" className="rounded-[8px] border border-cyan-300/30 bg-cyan-300/10 p-5 text-sm font-bold text-cyan-50">
              {t.createAccount}
            </a>
            <a href="#sign-in" className="rounded-[8px] border border-white/10 bg-white/[0.045] p-5 text-sm font-bold text-white">
              {t.signIn}
            </a>
          </div>
        </section>
        <section className="grid content-center gap-5">
          {error && <p className="rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">{error}</p>}
          {params.message && <p className="rounded-[8px] border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">{params.message}</p>}
          <div id="create-account" className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6 shadow-glow backdrop-blur">
            <h2 className="text-2xl font-bold">{t.createAccount}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{t.afterAccount}</p>
            <form action={createAccount} className="mt-6 space-y-4">
              <Field label={t.fullName} name="fullName" />
              <Field label={t.email} name="email" type="email" />
              <Field label={t.phone} name="phone" type="tel" />
              <Field label={t.password} name="password" type="password" />
              <Field label={t.confirmPassword} name="confirmPassword" type="password" />
              <SubmitButton>{t.createAccount}</SubmitButton>
            </form>
            <p className="mt-5 text-sm text-slate-300">
              {t.mentor}? <Link className="font-bold text-cyan-100" href="/signup/mentor">{t.mentorRegistration}</Link>
            </p>
          </div>
          <div id="sign-in" className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
            <h2 className="text-2xl font-bold">{t.signIn}</h2>
            <form action={login} className="mt-6 space-y-4">
              <Field label={t.email} name="email" type="email" />
              <Field label={t.password} name="password" type="password" />
              <SubmitButton>{t.signIn}</SubmitButton>
            </form>
            <p className="mt-5 text-sm text-slate-300">
              {t.needHelp} <Link className="text-cyan-100" href="/login">{t.openSignIn}</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
