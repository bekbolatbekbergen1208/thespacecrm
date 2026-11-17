import type { CenterState } from "./types";
export type StudentAttendanceRow = {
  id: string;
  date: string;
  time: string;
  group: string;
  topic: string;
  status: "present" | "absent" | "unknown";
  source: string;
  note: string;
};
export function studentAttendanceReport(
  state: CenterState,
  studentId: string,
  from = "",
  to = "",
) {
  const lessons = new Map(state.lessons.map((l) => [l.id, l]));
  const rows: StudentAttendanceRow[] = [];
  for (const record of state.historicalAttendance) {
    if (record.student_id !== studentId) continue;
    rows.push({
      id: `historical:${record.id}`,
      date: record.attendance_date,
      time: "",
      group: record.group_name ?? "Тобы көрсетілмеген",
      topic: "Тізім бойынша қатысу",
      status: record.status,
      source: "Тізімнен енгізілді",
      note: record.note,
    });
  }
  for (const record of state.attendance) {
    if (record.student_id !== studentId) continue;
    const lesson = lessons.get(record.lesson_id);
    if (!lesson) continue;
    rows.push({
      id: `lesson:${record.id}`,
      date: lesson.lesson_date,
      time: lesson.lesson_time,
      group: lesson.group_name,
      topic: lesson.topic,
      status: record.status,
      source: "Қатысу журналы",
      note: "",
    });
  }
  const filtered = rows
    .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.time.localeCompare(a.time) ||
        a.id.localeCompare(b.id),
    );
  const present = filtered.filter((r) => r.status === "present").length,
    absent = filtered.filter((r) => r.status === "absent").length,
    unknown = filtered.length - present - absent;
  return {
    rows: filtered,
    total: filtered.length,
    present,
    absent,
    unknown,
    rate:
      present + absent
        ? Math.round((100 * present) / (present + absent))
        : null,
  };
}
export function attendanceCsv(rows: StudentAttendanceRow[], name: string) {
  const cell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replace(/"/g, '""')}"`;
  const data = [
    [
      "Оқушы",
      "Күні",
      "Уақыты",
      "Тобы",
      "Тақырыбы",
      "Қатысу",
      "Дереккөзі",
      "Ескертпе",
    ],
    ...rows.map((r) => [
      name,
      r.date,
      r.time,
      r.group,
      r.topic,
      r.status === "present"
        ? "Келді"
        : r.status === "absent"
          ? "Келмеді"
          : "Белгісіз",
      r.source,
      r.note,
    ]),
  ];
  return "\uFEFF" + data.map((row) => row.map(cell).join(",")).join("\r\n");
}
