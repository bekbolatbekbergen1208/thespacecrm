import Link from "next/link";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { formatAuthError } from "@/lib/auth-errors";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  error,
  message,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  error?: string;
  message?: string;
}) {
  const formattedError = formatAuthError(error);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 py-10 text-white">
      <div className="premium-card w-full max-w-md p-7">
        <Link href="/" className="group inline-flex items-center gap-3 text-lg font-black tracking-wide text-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-200 via-white to-violet-200 text-sm text-slate-950 shadow-glow transition group-hover:scale-105">CS</span>
          CRM.Space
        </Link>
        <p className="mt-8 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100">
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Secure workspace
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
        {formattedError && <p className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{formattedError}</p>}
        {message && <p className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm font-semibold text-cyan-100">{message}</p>}
        <div className="mt-6">{children}</div>
        <div className="mt-6 border-t border-white/10 pt-5 text-sm text-slate-300">{footer}</div>
      </div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
}) {
  return (
    <label className="group block">
      <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition group-focus-within:text-cyan-100">
        <BadgeCheck className="h-3.5 w-3.5" />
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="premium-input h-12 w-full px-4 text-sm text-white outline-none"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="premium-button mt-5 h-12 w-full bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
      {children}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
