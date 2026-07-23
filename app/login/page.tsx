import Link from "next/link";
import { forgotPassword, login } from "@/app/actions";
import { AuthCard, Field, SubmitButton } from "@/components/app/auth-card";
import { formatAuthError } from "@/lib/auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const error = formatAuthError(params.error);
  return (
    <AuthCard
      title="Log in"
      subtitle="Access your CRM.Space company workspace."
      error={error}
      message={params.message}
      footer={
        <div className="space-y-2">
          <p>New to CRM.Space? <Link className="text-cyan-100" href="/signup">Create an account</Link></p>
          <p>Mentor account? <Link className="text-cyan-100" href="/signup/mentor">Request mentor access</Link></p>
          <p>Already registered without a company? <Link className="text-cyan-100" href="/onboarding">Choose your role</Link></p>
        </div>
      }
    >
      <form action={login} className="space-y-4">
        <Field label="Email" name="email" type="email" />
        <Field label="Password" name="password" type="password" />
        <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
          <input
            name="rememberSession"
            type="checkbox"
            value="yes"
            defaultChecked
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 accent-cyan-300 outline-none"
          />
          <span>
            <span className="block font-black text-white">Оставаться в системе</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Безопасно держать вход на этом устройстве, пока вы сами не нажмёте “Выйти”.
            </span>
          </span>
        </label>
        <SubmitButton>Log in</SubmitButton>
      </form>
      <form action={forgotPassword} className="mt-6 border-t border-white/10 pt-5">
        <Field label="Forgot Password Email" name="email" type="email" />
        <SubmitButton>Send reset email</SubmitButton>
      </form>
    </AuthCard>
  );
}
