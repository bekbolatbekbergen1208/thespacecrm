"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCheck,
  Download,
  GraduationCap,
  Printer,
  UserRound,
  XCircle,
} from "lucide-react";
import type { CenterState } from "@/lib/center/types";
import { attendanceCsv, studentAttendanceReport } from "@/lib/center/reports";
export function StudentReport({
  state,
  requestedStudentId,
}: {
  state: CenterState;
  requestedStudentId?: string;
}) {
  const [studentId, setStudentId] = useState(
      requestedStudentId
        ? state.students.some((s) => s.id === requestedStudentId)
          ? requestedStudentId
          : ""
        : (state.students[0]?.id ?? ""),
    ),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [search, setSearch] = useState("");

  const student = state.students.find((s) => s.id === studentId),
    invalidRange = Boolean(from && to && from > to),
    report = studentAttendanceReport(state, studentId, from, to);
  const shown = state.students.filter(
    (s) =>
      `${s.name} ${s.group_name ?? ""}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) || s.id === studentId,
  );
  const formatDate = (date: string) =>
    date ? date.split("-").reverse().join(".") : "—";
  function selectStudent(id: string) {
    setStudentId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("student", id);
    window.history.replaceState(null, "", url);
  }
  return (
    <div className="student-report">
      <section className="panel report-filters">
        <label>
          Оқушыны іздеу
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Аты немесе тобы"
            aria-label="Есеп үшін оқушы іздеу"
          />
        </label>
        <label>
          Оқушы
          <select
            value={studentId}
            onChange={(e) => selectStudent(e.target.value)}
          >
            <option value="">Оқушыны таңдаңыз</option>
            {shown.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.group_name || "Топсыз"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Бастапқы күн
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Соңғы күн
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="secondary"
          onClick={() => {
            setFrom("");
            setTo("");
            setSearch("");
          }}
        >
          Барлық кезең
        </button>
      </section>
      {invalidRange && (
        <p className="error-banner" role="alert">
          Бастапқы күн соңғы күннен кеш болмауы керек.
        </p>
      )}
      {student ? (
        <>
          <section className="panel report-student">
            <div className="report-student-heading">
              <div className="report-student-icon">
                <UserRound size={25} />
              </div>
              <div>
                <h2>{student.name}</h2>
                <p>
                  {student.group_name || "Тобы көрсетілмеген"}{" "}
                  {student.student_type === "trial" && "· Пробник"}
                </p>
              </div>
              <div className="report-export">
                {state.account.role === "admin" && (
                  <Link
                    className="secondary"
                    href={`/workspace/students?student=${student.id}`}
                  >
                    Карточканы өзгерту
                  </Link>
                )}
                {state.account.role === "admin" && (
                  <Link
                    className="secondary"
                    href={`/workspace/contracts?student=${student.id}`}
                  >
                    Договор
                  </Link>
                )}
                <button
                  className="secondary"
                  disabled={invalidRange}
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  Басып шығару / PDF
                </button>
                <button
                  className="primary"
                  disabled={invalidRange || !report.total}
                  onClick={() => {
                    const blob = new Blob(
                      [attendanceCsv(report.rows, student.name)],
                      { type: "text/csv;charset=utf-8" },
                    );
                    const url = URL.createObjectURL(blob),
                      a = document.createElement("a");
                    a.href = url;
                    a.download = `S7-${student.name}-attendance.csv`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  <Download size={16} />
                  CSV жүктеу
                </button>
              </div>
            </div>
            <div className="report-details">
              <span>
                Ата-анасы:{" "}
                <strong>{student.parent_name || "Көрсетілмеген"}</strong>
              </span>
              <span>
                Телефон:{" "}
                <strong>
                  {student.phone ? `+${student.phone}` : "Көрсетілмеген"}
                </strong>
              </span>
              <span>
                Кезең:{" "}
                <strong>
                  {from ? formatDate(from) : "Басынан"} —{" "}
                  {to ? formatDate(to) : "Барлық күндер"}
                </strong>
              </span>
            </div>
            {student.notes && <p className="report-note">{student.notes}</p>}
          </section>
          <div className="stats-grid">
            <article className="stat-card">
              <div>
                <span>Қатысу жазбалары</span>
                <CalendarDays size={18} />
              </div>
              <strong>{invalidRange ? "—" : report.total}</strong>
              <p>Таңдалған кезеңде</p>
            </article>
            <article className="stat-card">
              <div>
                <span>Келді</span>
                <CheckCheck size={18} />
              </div>
              <strong>{invalidRange ? "—" : report.present}</strong>
              <p>Сабаққа қатысқан</p>
            </article>
            <article className="stat-card">
              <div>
                <span>Келмеді</span>
                <XCircle size={18} />
              </div>
              <strong>{invalidRange ? "—" : report.absent}</strong>
              <p>Сабаққа қатыспаған</p>
            </article>
            <article className="stat-card">
              <div>
                <span>Қатысу үлесі</span>
                <GraduationCap size={18} />
              </div>
              <strong>
                {invalidRange || report.rate === null ? "—" : `${report.rate}%`}
              </strong>
              <p>
                {report.unknown
                  ? `${report.unknown} жазбаның қатысуы белгісіз`
                  : "Белгіленген қатысу бойынша"}
              </p>
            </article>
          </div>
          <section className="panel table-panel">
            <div className="panel-heading">
              <h2>Оқушының қатысу тарихы</h2>
              <span className="tag">
                {invalidRange ? 0 : report.total} жазба
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Күні</th>
                    <th>Уақыты</th>
                    <th>Тобы</th>
                    <th>Сабақ / ескертпе</th>
                    <th>Қатысу</th>
                    <th>Дереккөзі</th>
                  </tr>
                </thead>
                <tbody>
                  {!invalidRange &&
                    report.rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{formatDate(row.date)}</strong>
                        </td>
                        <td>{row.time.slice(0, 5) || "Көрсетілмеген"}</td>
                        <td>{row.group}</td>
                        <td>
                          {row.topic}
                          {row.note && (
                            <small className="block muted">{row.note}</small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status ${row.status === "present" ? "green" : row.status === "absent" ? "red" : "amber"}`}
                          >
                            {row.status === "present"
                              ? "Келді"
                              : row.status === "absent"
                                ? "Келмеді"
                                : "Белгісіз"}
                          </span>
                        </td>
                        <td>{row.source}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!invalidRange && !report.total && (
              <div className="empty">
                <CalendarDays size={28} />
                <p>
                  Бұл кезеңге қатысу жазбалары жоқ. Жазбаның болмауы «келмеді»
                  дегенді білдірмейді.
                </p>
              </div>
            )}
          </section>
          <p className="report-footnote">
            Тізімдегі белгілер мен қатысу журналы көрсетіледі. Уақыты берілмеген
            жазбаларға сабақ уақыты қосылмаған.
          </p>
          <Link
            className="text-button report-return"
            href="/workspace/students"
          >
            ← Оқушылар тізіміне оралу
          </Link>
        </>
      ) : (
        <div className="panel empty">
          <GraduationCap size={28} />
          <p>
            Оқушыны таңдаңыз. Оқушы табылмаса, оған қолжетімділікті тексеріңіз.
          </p>
        </div>
      )}
    </div>
  );
}
