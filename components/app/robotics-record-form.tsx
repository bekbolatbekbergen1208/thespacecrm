"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, FileText, Save, Type } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { translateLiteral, type getDictionary, type Locale } from "@/lib/i18n";
import type { RoboticsField, RoboticsModuleKey } from "@/lib/robotics-crm";

export function RoboticsRecordForm({
  moduleKey,
  fields,
  action,
  dictionary,
  locale,
  record,
  submitLabel,
}: {
  moduleKey: RoboticsModuleKey;
  fields: RoboticsField[];
  action: (formData: FormData) => void;
  dictionary: ReturnType<typeof getDictionary>;
  locale: Locale;
  record?: Record<string, unknown>;
  submitLabel?: string;
}) {
  const shape = fields.reduce<Record<string, z.ZodType<string>>>((acc, field) => {
    acc[field.name] = field.required === false ? z.string() : z.string().min(1, `${field.label} is required`);
    return acc;
  }, {});
  const schema = z.object(shape);
  const { register, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(fields.map((field) => [field.name, String(record?.[field.name] ?? "")])),
  });

  return (
    <motion.form
      action={action}
      className="grid gap-4 md:grid-cols-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <input type="hidden" name="module" value={moduleKey} />
      {typeof record?.id === "string" && <input type="hidden" name="id" value={record.id} />}
      {fields.map((field) => (
        <label key={field.name} className={field.type === "textarea" ? "group block md:col-span-2" : "group block"}>
          <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition group-focus-within:text-cyan-100">
            {field.type === "textarea" ? <FileText className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
            {translateLiteral(locale, field.label)}
            {field.required === false && <span className="font-semibold normal-case tracking-normal text-slate-600">{dictionary.optional}</span>}
          </span>
          {field.type === "textarea" ? (
            <textarea
              {...register(field.name)}
              name={field.name}
              defaultValue={String(record?.[field.name] ?? "")}
              placeholder=" "
              className="premium-input min-h-28 w-full px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
            />
          ) : field.type === "select" ? (
            <span className="relative block">
              <select
                {...register(field.name)}
                name={field.name}
                defaultValue={String(record?.[field.name] ?? "")}
                className="premium-input h-12 w-full appearance-none px-4 pr-10 text-sm text-white outline-none"
              >
                <option value="">{dictionary.select}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>{translateLiteral(locale, option)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </span>
          ) : (
            <input
              {...register(field.name)}
              name={field.name}
              type={field.type ?? "text"}
              defaultValue={String(record?.[field.name] ?? "")}
              placeholder=" "
              className="premium-input h-12 w-full px-4 text-sm text-white outline-none placeholder:text-slate-600"
            />
          )}
          <AnimatePresence>
            {errors[field.name] && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 flex items-center gap-2 text-xs font-semibold text-red-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-300" />
                {String(errors[field.name]?.message)}
              </motion.span>
            )}
          </AnimatePresence>
        </label>
      ))}
      <div className="md:col-span-2">
        <button className="premium-button h-11 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
          <Save className="h-4 w-4" />
          {submitLabel ?? dictionary.save}
          <Check className="h-4 w-4 text-emerald-600" />
        </button>
      </div>
    </motion.form>
  );
}
