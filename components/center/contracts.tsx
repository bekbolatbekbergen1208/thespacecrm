"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, Printer, Save, Settings2, X } from "lucide-react";
import type { CenterState } from "@/lib/center/types";
import {
  contractFields,
  renderContract,
  defaultContractSettings,
  type ContractSettings,
} from "@/lib/center/contracts-template";
export function Contracts({
  state,
  requestedStudentId,
  onAction,
}: {
  state: CenterState;
  requestedStudentId?: string;
  onAction: (
    input: Record<string, unknown>,
  ) => Promise<{ contractId?: string } | null>;
}) {
  const [studentId, setStudentId] = useState(
      requestedStudentId ?? state.students[0]?.id ?? "",
    ),
    [settings, setSettings] = useState<ContractSettings>(
      state.contractSettings ?? defaultContractSettings,
    ),
    [showTemplate, setShowTemplate] = useState(false),
    [selectedId, setSelectedId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const student = state.students.find((s) => s.id === studentId),
    group = state.groups.find((g) => g.id === student?.group_id);
  const [fields, setFields] = useState({
    contract_date: state.today,
    start_date: state.today,
    end_date: "",
    schedule: "",
    amount: group?.monthly_fee ?? "",
    billing_period: "месяц",
    payment_due: "",
    terms: "",
  });
  const selected = state.contracts.find((c) => c.id === selectedId),
    studentContracts = state.contracts.filter(
      (c) => c.student_id === studentId,
    );
  const set = (key: keyof typeof fields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));
  const setOrg = (key: keyof ContractSettings, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const fmt = (v: string) => (v ? v.split("-").reverse().join(".") : "—");
  let preview = "";
  try {
    preview = renderContract(settings.template, {
      ...settings,
      number: "[номер присваивается при сохранении]",
      date: fmt(fields.contract_date),
      student_name: student?.name ?? "",
      parent_name: student?.parent_name ?? "",
      birth_date: fmt(student?.birth_date ?? ""),
      parent_iin: student?.parent_iin ?? "",
      parent_email: student?.parent_email ?? "",
      phone: student?.phone ?? "",
      address: student?.address ?? "",
      group_name: group?.name ?? "",
      course: group?.course ?? "",
      ...fields,
      start_date: fmt(fields.start_date),
      end_date: fmt(fields.end_date),
    });
  } catch {}
  async function run(input: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const result = await onAction(input);
      if (result?.contractId) setSelectedId(result.contractId);
      if (!result) setError("Деректерді тексеріңіз. Договор сақталмады.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="contracts-workspace">
      <section className="panel">
        <div className="panel-heading">
          <h2>Оқушы деректерінен договор құру</h2>
          <span className="tag">ЖОБА · ҚОЛ ҚОЙЫЛМАҒАН</span>
        </div>
        <form
          className="contract-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void run({
              action: "createContract",
              student_id: studentId,
              settings,
              ...fields,
            });
          }}
        >
          <label>
            Оқушы
            <select
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setSelectedId("");
                const s = state.students.find((s) => s.id === e.target.value),
                  g = state.groups.find((g) => g.id === s?.group_id);
                set("amount", g?.monthly_fee ?? "");
              }}
              required
            >
              <option value="">Оқушыны таңдаңыз</option>
              {state.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.group_name}
                </option>
              ))}
            </select>
          </label>
          {student && (
            <div className="contract-student-summary">
              <span>
                <strong>{student.name}</strong> ·{" "}
                {student.group_name || "Топсыз"}
              </span>
              <span>Ата-анасы: {student.parent_name || "Толтырылмаған"}</span>
              <span>
                Телефон: {student.phone ? `+${student.phone}` : "Толтырылмаған"}
              </span>
              <Link
                className="text-button"
                href={`/workspace/students?student=${student.id}`}
              >
                Оқушы карточкасын өзгерту →
              </Link>
            </div>
          )}
          {student && !student.parent_name && (
            <p className="error-text">
              Договор құру үшін оқушы карточкасында ата-анасының толық атын
              енгізіңіз.
            </p>
          )}
          <h3>Орталық деректері</h3>
          <div className="contract-form-grid">
            <label>
              Орындаушының заңды атауы *
              <input
                value={settings.provider_name}
                onChange={(e) => setOrg("provider_name", e.target.value)}
                required
                maxLength={500}
                placeholder="ЖК / ЖШС атауы"
              />
            </label>
            <label>
              Қала *
              <input
                value={settings.city}
                onChange={(e) => setOrg("city", e.target.value)}
                required
                maxLength={500}
              />
            </label>
            <label>
              Орындаушының өкілі
              <input
                value={settings.representative}
                onChange={(e) => setOrg("representative", e.target.value)}
                maxLength={500}
              />
            </label>
            <label>
              Договор күні *
              <input
                type="date"
                value={fields.contract_date}
                onChange={(e) => set("contract_date", e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            Орындаушының реквизиттері
            <textarea
              rows={3}
              value={settings.provider_details}
              onChange={(e) => setOrg("provider_details", e.target.value)}
              maxLength={5000}
              placeholder="БСН/ЖСН, мекенжай, телефон, төлем реквизиттері — өз деректеріңіз"
            />
          </label>
          <h3>Оқу және төлем шарттары</h3>
          <div className="contract-form-grid">
            <label>
              Басталу күні *
              <input
                type="date"
                value={fields.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                required
              />
            </label>
            <label>
              Аяқталу күні
              <input
                type="date"
                min={fields.start_date}
                value={fields.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </label>
            <label>
              Құны, ₸ *
              <input
                type="number"
                min="0"
                step="0.01"
                max="100000000"
                value={fields.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
              />
            </label>
            <label>
              Төлем кезеңі *
              <input
                value={fields.billing_period}
                onChange={(e) => set("billing_period", e.target.value)}
                required
                maxLength={500}
                placeholder="ай / сабақ / курс"
              />
            </label>
          </div>
          <label>
            Сабақ кестесі *
            <input
              value={fields.schedule}
              onChange={(e) => set("schedule", e.target.value)}
              required
              maxLength={500}
              placeholder="Күндері мен уақыты"
            />
          </label>
          <label>
            Төлем мерзімі *
            <input
              value={fields.payment_due}
              onChange={(e) => set("payment_due", e.target.value)}
              required
              maxLength={500}
            />
          </label>
          <label>
            Өзіңіз белгілейтін шарттар *
            <textarea
              rows={5}
              value={fields.terms}
              onChange={(e) => set("terms", e.target.value)}
              required
              maxLength={20000}
              placeholder="Сабақты ауыстыру, тоқтату, төлем және басқа келісілген шарттарды жазыңыз"
            />
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => setShowTemplate((v) => !v)}
          >
            <Settings2 size={15} />
            {showTemplate ? "Шаблонды жабу" : "Договор шаблонын өзгерту"}
          </button>
          {showTemplate && (
            <div className="contract-template">
              <label>
                Договор мәтіні
                <textarea
                  rows={18}
                  value={settings.template}
                  onChange={(e) => setOrg("template", e.target.value)}
                  maxLength={50000}
                  required
                />
              </label>
              <p>
                Автоматты өрістер:{" "}
                {contractFields.map((k) => `{{${k}}}`).join(", ")}
              </p>
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => run({ action: "contractSettings", settings })}
              >
                <Save size={15} />
                Шаблон мен орталық деректерін сақтау
              </button>
            </div>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="contract-submit">
            <span>
              Деректер карточкадан алынады. Сақталған договор кейін карточка
              өзгерсе де өзгермейді.
            </span>
            <button
              className="primary"
              disabled={busy || !student?.parent_name}
            >
              <FileText size={16} />
              {busy ? "Сақталуда…" : "Договорды құру және сақтау"}
            </button>
          </div>
        </form>
      </section>
      <section className="panel contract-preview">
        <div className="panel-heading">
          <h2>Алдын ала қарау</h2>
          <span className="tag">САҚТАЛМАҒАН</span>
        </div>
        <pre>{preview || "Шаблондағы өрістерді тексеріңіз."}</pre>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <h2>Сақталған договорлар</h2>
          <span className="tag">{studentContracts.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Нөмірі</th>
                <th>Оқушы</th>
                <th>Күні</th>
                <th>Күйі</th>
                <th>Договор</th>
              </tr>
            </thead>
            <tbody>
              {studentContracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.number}</td>
                  <td>{c.student_name}</td>
                  <td>{fmt(c.contract_date)}</td>
                  <td>
                    <span className="status amber">Жоба</span>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        onClick={() => setSelectedId(c.id)}
                      >
                        Ашу
                      </button>
                      <a
                        className="secondary compact"
                        href={`/api/center/contracts/print?id=${c.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Printer size={15} />
                        PDF / Басып шығару
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!studentContracts.length && (
          <div className="empty">
            <FileText size={26} />
            <p>Бұл оқушыға договор әлі жасалмаған.</p>
          </div>
        )}
      </section>
      {selected && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Сақталған договор"
            className="center-modal wide"
          >
            <div className="modal-heading">
              <h2>{selected.number} · Договор жобасы</h2>
              <button
                className="icon-button"
                onClick={() => setSelectedId("")}
                aria-label="Жабу"
              >
                <X />
              </button>
            </div>
            <pre className="contract-saved-body">{selected.body}</pre>
            <a
              className="primary"
              href={`/api/center/contracts/print?id=${selected.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Printer size={16} />
              PDF / Басып шығару
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
