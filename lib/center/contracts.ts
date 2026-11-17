import type { Transaction } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import type { Account } from "./session";
import type { Student } from "./types";
import {
  defaultContractSettings,
  validateContractTemplate,
  renderContract,
  type ContractSettings,
} from "./contracts-template";
export type { ContractSettings, SavedContract } from "./contracts-template";
function requireAdmin(account: Account) {
  if (account.role !== "admin") throw new Error("FORBIDDEN");
}
const text = z.string().trim().min(1).max(500);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Күн қате",
  );
const optionalDate = z.union([z.literal(""), date]);
const settingsSchema = z.object({
  provider_name: text,
  representative: z.string().trim().max(500),
  city: text,
  provider_details: z.string().trim().max(5000),
  template: z.string().trim().min(20).max(50000),
});
export async function readContractSettings(): Promise<ContractSettings> {
  const result = (
    await (
      await getDb()
    ).query<ContractSettings>(
      "SELECT provider_name,representative,city,provider_details,template FROM contract_settings WHERE id='main'",
    )
  ).rows[0];
  return result ?? defaultContractSettings;
}
async function saveSettings(
  tx: Pick<Transaction, "query">,
  settings: ContractSettings,
) {
  await tx.query(
    "INSERT INTO contract_settings(id,provider_name,representative,city,provider_details,template) VALUES('main',$1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET provider_name=$1,representative=$2,city=$3,provider_details=$4,template=$5,updated_at=now()",
    [
      settings.provider_name,
      settings.representative,
      settings.city,
      settings.provider_details,
      settings.template,
    ],
  );
}
export async function contractAction(
  account: Account,
  input: Record<string, unknown>,
) {
  requireAdmin(account);
  const db = await getDb();
  const settings = settingsSchema.parse(input.settings);
  validateContractTemplate(settings.template);
  if (input.action === "contractSettings") {
    await saveSettings(db, settings);
    return { message: "Договор шаблоны мен орталық деректері сақталды" };
  }
  const v = z
    .object({
      student_id: text,
      contract_date: date,
      start_date: date,
      end_date: optionalDate,
      schedule: text,
      amount: z.preprocess(
        (v) => (v === "" ? NaN : v),
        z.coerce
          .number()
          .min(0)
          .max(100000000)
          .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001),
      ),
      billing_period: text,
      payment_due: text,
      terms: z.string().trim().min(1, "Договор шарттарын енгізіңіз").max(20000),
    })
    .parse(input);
  if (v.end_date && v.end_date < v.start_date)
    throw new Error("Соңғы күн бастапқы күннен ерте болмауы керек");
  return db.transaction(async (tx) => {
    const student = (
      await tx.query<Student & { course: string; group_name: string }>(
        "SELECT s.*,s.birth_date::text,g.name AS group_name,g.course FROM students s LEFT JOIN groups g ON g.id=s.group_id WHERE s.id=$1 FOR UPDATE OF s",
        [v.student_id],
      )
    ).rows[0];
    if (!student) throw new Error("Оқушы табылмады");
    if (!student.parent_name.trim())
      throw new Error(
        "Алдымен оқушы карточкасында ата-анасының толық атын толтырыңыз",
      );
    const sequence = (
      await tx.query<{ value: string }>(
        "SELECT nextval('contract_number_seq')::text AS value",
      )
    ).rows[0].value;
    const number = `S7-${v.contract_date.slice(0, 4)}-${sequence.padStart(5, "0")}`;
    const fmt = (value: string) =>
      value ? value.split("-").reverse().join(".") : "—";
    const values: Record<string, string> = {
      number,
      date: fmt(v.contract_date),
      ...settings,
      student_name: student.name,
      birth_date: fmt(student.birth_date ?? ""),
      parent_name: student.parent_name,
      parent_iin: student.parent_iin,
      parent_email: student.parent_email,
      phone: student.phone ? `+${student.phone}` : "",
      address: student.address,
      group_name: student.group_name ?? "",
      course: student.course ?? "Робототехника",
      start_date: fmt(v.start_date),
      end_date: fmt(v.end_date),
      schedule: v.schedule,
      amount: v.amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 }),
      billing_period: v.billing_period,
      payment_due: v.payment_due,
      terms: v.terms,
    };
    const body = renderContract(settings.template, values),
      id = randomUUID();
    await saveSettings(tx, settings);
    await tx.query(
      "INSERT INTO student_contracts(id,number,student_id,contract_date,body,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)",
      [
        id,
        number,
        student.id,
        v.contract_date,
        body,
        JSON.stringify({ values, template: settings.template }),
        account.id,
      ],
    );
    return { message: `Договор ${number} құрылды`, contractId: id };
  });
}
