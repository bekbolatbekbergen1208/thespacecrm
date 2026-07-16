import { translateLiteral, type getDictionary, type Locale } from "@/lib/i18n";
import type { RoboticsField, RoboticsModuleKey } from "@/lib/robotics-crm";
import { Check, ChevronDown, FileText, Save, Type } from "lucide-react";

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
  action: (formData: FormData) => void | Promise<void>;
  dictionary: ReturnType<typeof getDictionary>;
  locale: Locale;
  record?: Record<string, unknown>;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="module" value={moduleKey} />
      {typeof record?.id === "string" && <input type="hidden" name="id" value={record.id} />}
      {fields.map((field) => (
        <RoboticsFieldControl
          key={field.name}
          field={field}
          dictionary={dictionary}
          locale={locale}
          defaultValue={String(record?.[field.name] ?? "")}
        />
      ))}
      <div className="md:col-span-2">
        <button className="premium-button h-11 bg-white px-5 text-sm text-slate-950 shadow-glow hover:bg-cyan-50">
          <Save className="h-4 w-4" />
          {submitLabel ?? dictionary.save}
          <Check className="h-4 w-4 text-emerald-600" />
        </button>
      </div>
    </form>
  );
}

function RoboticsFieldControl({
  field,
  dictionary,
  locale,
  defaultValue,
}: {
  field: RoboticsField;
  dictionary: ReturnType<typeof getDictionary>;
  locale: Locale;
  defaultValue: string;
}) {
  if (field.name === "photo_url") {
    return (
      <label className="group block md:col-span-2">
        <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition group-focus-within:text-cyan-100">
          <Type className="h-3.5 w-3.5" />
          {translateLiteral(locale, field.label)}
          {field.required === false && <span className="font-semibold normal-case tracking-normal text-slate-600">{dictionary.optional}</span>}
        </span>
        <input
          name={field.name}
          type="url"
          defaultValue={defaultValue}
          placeholder="https://..."
          className="premium-input h-12 w-full px-4 text-sm text-white outline-none placeholder:text-slate-600"
        />
      </label>
    );
  }

  const label = translateLiteral(locale, field.label);
  const required = field.required !== false;

  return (
    <label className={field.type === "textarea" ? "group block md:col-span-2" : "group block"}>
      <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 transition group-focus-within:text-cyan-100">
        {field.type === "textarea" ? <FileText className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
        {label}
        {!required && <span className="font-semibold normal-case tracking-normal text-slate-600">{dictionary.optional}</span>}
      </span>
      {field.type === "textarea" ? (
        <textarea
          name={field.name}
          defaultValue={defaultValue}
          required={required}
          placeholder=" "
          className="premium-input min-h-28 w-full px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
        />
      ) : field.type === "select" ? (
        <span className="relative block">
          <select
            name={field.name}
            defaultValue={defaultValue}
            required={required}
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
          name={field.name}
          type={field.type ?? "text"}
          defaultValue={defaultValue}
          required={required}
          placeholder=" "
          className="premium-input h-12 w-full px-4 text-sm text-white outline-none placeholder:text-slate-600"
        />
      )}
    </label>
  );
}
