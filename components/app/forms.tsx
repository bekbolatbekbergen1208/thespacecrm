import { Field } from "@/components/app/auth-card";
import { AlertTriangle, Send } from "lucide-react";

export function SmallButton({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      className={`premium-button h-9 px-4 text-xs ${
        danger ? "border border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/15" : "bg-white text-slate-950 shadow-glow hover:bg-cyan-50"
      }`}
    >
      {danger ? <AlertTriangle className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function Textarea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <label className="group block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition group-focus-within:text-cyan-100">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        className="premium-input min-h-28 w-full px-4 py-3 text-sm text-white outline-none"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="group block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition group-focus-within:text-cyan-100">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="premium-input h-12 w-full px-4 text-sm text-white outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export { Field };
