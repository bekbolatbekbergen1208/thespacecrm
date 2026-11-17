"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  Users,
  X,
  Printer,
  FileText,
  Download,
  ChevronRight,
} from "lucide-react";
import type {
  CenterState,
  Draft,
  Lesson,
  Method,
  Student,
  Group,
} from "@/lib/center/types";
import { QrScanner } from "./scanner";
import { StudentReport } from "./student-report";
import { Contracts } from "./contracts";
import "./center.css";
import "./crm.css";
import "./glass.css";
import { BrandMark } from "./brand-mark";
import { BrandingSettings } from "./branding-settings";
const navigation = [
  ["overview", "Шолу", LayoutDashboard],
  ["students", "Оқушылар", GraduationCap],
  ["groups", "Топтар", Users],
  ["team", "Қызметкерлер", Users],
  ["schedule", "Сабақ кестесі", CalendarDays],
  ["attendance", "QR қатысу", QrCode],
  ["methods", "Әдістемелер", BookOpen],
  ["tasks", "Тапсырмалар", ClipboardList],
  ["payments", "Төлемдер", CreditCard],
  ["messages", "WhatsApp", MessageCircle],
  ["reports", "Оқушы есептері", FileText],
  ["contracts", "Договорлар", FileText],
] as const;
const money = (v: string | number) => `${Number(v).toLocaleString("ru-RU")} ₸`;
const day = (v: string) =>
  new Date(`${v.slice(0, 10)}T12:00:00+05:00`).toLocaleDateString("kk-KZ", {
    day: "numeric",
    month: "long",
  });
const initials = (name: string) =>
  name
    .split(" ")
    .map((v) => v[0])
    .slice(0, 2)
    .join("");
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  value?: string;
  required?: boolean;
};
type FormSpec = { action: string; title: string; fields: Field[] };
type ApiResult = {
  message: string;
  studentId?: string;
  contractId?: string;
  draft?: { id: string; body: string; phone: string };
};
export function CenterWorkspace({
  initial,
  section,
  initialStudentId,
}: {
  initial: CenterState;
  section: string;
  initialStudentId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial),
    [search, setSearch] = useState(""),
    [form, setForm] = useState<FormSpec | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [viewMethod, setViewMethod] = useState<Method | null>(null),
    [draft, setDraft] = useState<{ body: string; phone: string } | null>(null),
    [lessonId, setLessonId] = useState(
      initial.lessons.find((l) => l.lesson_date === initial.today)?.id ??
        initial.lessons[0]?.id ??
        "",
    ),
    [badgeId, setBadgeId] = useState(""),
    [closeConfirm, setCloseConfirm] = useState(false);
  const [brandVersion, setBrandVersion] = useState(0);
  const admin = state.account.role === "admin",
    lock = useRef(false);
  const selected = state.lessons.find((l) => l.id === lessonId),
    todayLessons = state.lessons.filter((l) => l.lesson_date === state.today),
    tomorrowLessons = state.lessons.filter(
      (l) => l.lesson_date === state.tomorrow,
    ),
    todo = state.tasks.filter((t) => t.status === "todo"),
    debt = state.charges.reduce((a, c) => a + Number(c.balance), 0);
  const lessonRoster = selected
    ? state.students.filter(
        (s) =>
          state.attendance.some(
            (a) => a.lesson_id === selected.id && a.student_id === s.id,
          ) ||
          (selected.status !== "completed" && s.group_id === selected.group_id),
      )
    : [];
  const groups = state.groups.map((g) => ({ value: g.id, label: g.name })),
    employees = state.accounts.map((a) => ({ value: a.id, label: a.name })),
    mentors = state.accounts
      .filter((a) => a.role === "teacher")
      .map((a) => ({ value: a.id, label: a.name })),
    students = state.students.map((s) => ({ value: s.id, label: s.name })),
    methods = state.methods.map((m) => ({ value: m.id, label: m.title }));
  const match = (v: string) =>
    v.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  async function refresh() {
    const r = await fetch("/api/center", { cache: "no-store" });
    if (r.status === 401) {
      window.location.assign("/workspace/login");
      return;
    }
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setState(d);
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  async function act(
    input: Record<string, unknown>,
  ): Promise<ApiResult | null> {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const d = await r.json();
      if (r.status === 401) {
        window.location.assign("/workspace/login");
        return null;
      }
      if (!r.ok) throw Error(d.error);
      setNotice(d.message);
      if (input.action === "logout") {
        window.location.assign("/workspace/login");
        return d;
      }
      await refresh();
      if (d.studentId && input.action === "student" && !input.id)
        setBadgeId(d.studentId);
      if (d.draft) setDraft(d.draft);
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("lesson");
    if (id && initial.lessons.some((l) => l.id === id)) setLessonId(id);
  }, [section, initial.lessons]);
  const field = (
    name: string,
    label: string,
    type = "text",
    options?: Field["options"],
    value?: string,
  ): Field => ({ name, label, type, options, value });
  const studentExtraFields = (s?: Student): Field[] => [
    {
      ...field(
        "birth_date",
        "Туған күні",
        "date",
        undefined,
        s?.birth_date ?? "",
      ),
      required: false,
    },
    {
      ...field("address", "Мекенжай", "text", undefined, s?.address ?? ""),
      required: false,
    },
    {
      ...field(
        "parent_iin",
        "Ата-анасының ЖСН / ИИН (міндетті емес)",
        "text",
        undefined,
        s?.parent_iin ?? "",
      ),
      required: false,
    },
    {
      ...field(
        "parent_email",
        "Ата-анасының email-і",
        "email",
        undefined,
        s?.parent_email ?? "",
      ),
      required: false,
    },
    field(
      "student_type",
      "Оқушы түрі",
      "select",
      [
        { value: "regular", label: "Негізгі оқушы" },
        { value: "trial", label: "Пробник" },
      ],
      s?.student_type ?? "regular",
    ),
    {
      ...field("notes", "Ескертпелер", "textarea", undefined, s?.notes ?? ""),
      required: false,
    },
  ];
  const openStudent = () =>
    setForm({
      action: "student",
      title: "Жаңа оқушы",
      fields: [
        field("name", "Оқушының аты-жөні"),
        { ...field("parent_name", "Ата-анасының аты-жөні"), required: false },
        {
          ...field("phone", "Ата-анасының WhatsApp нөмірі", "tel"),
          required: false,
        },
        field("group_id", "Оқу тобы", "select", groups),
        ...studentExtraFields(),
      ],
    });
  const editStudent = (s: Student) =>
    setForm({
      action: "student",
      title: "Оқушыны өзгерту",
      fields: [
        { name: "id", label: "", type: "hidden", value: s.id },
        field("name", "Оқушының аты-жөні", "text", undefined, s.name),
        field(
          "parent_name",
          "Ата-анасының аты-жөні",
          "text",
          undefined,
          s.parent_name,
        ),
        field(
          "phone",
          "Ата-анасының WhatsApp нөмірі",
          "tel",
          undefined,
          s.phone,
        ),
        field("group_id", "Оқу тобы", "select", groups, s.group_id ?? ""),
        ...studentExtraFields(s),
      ].map((f) =>
        ["parent_name", "phone", "monthly_fee"].includes(f.name)
          ? { ...f, required: false }
          : f,
      ),
    });
  const editStudentRef = useRef(editStudent);
  editStudentRef.current = editStudent;
  useEffect(() => {
    if (section === "students" && initialStudentId) {
      const student = initial.students.find((s) => s.id === initialStudentId);
      if (student) editStudentRef.current(student);
    }
  }, [section, initialStudentId, initial.students]);
  const editGroup = (g: Group) =>
    setForm({
      action: "group",
      title: "Топты өзгерту",
      fields: [
        { name: "id", label: "", type: "hidden", value: g.id },
        field("name", "Топ атауы", "text", undefined, g.name),
        field("course", "Курс", "text", undefined, g.course),
        field(
          "teacher_id",
          "Жауапты ментор",
          "select",
          mentors,
          g.teacher_id ?? "",
        ),
        field(
          "monthly_fee",
          "Айлық құны, ₸",
          "number",
          undefined,
          g.monthly_fee ?? "",
        ),
      ].map((f) =>
        ["parent_name", "phone", "monthly_fee"].includes(f.name)
          ? { ...f, required: false }
          : f,
      ),
    });
  const editMethod = (m: Method) =>
    setForm({
      action: "method",
      title: "Әдістемені өзгерту",
      fields: [
        { name: "id", label: "", type: "hidden", value: m.id },
        field("title", "Әдістеме атауы", "text", undefined, m.title),
        field("content", "Сабақ жоспары", "textarea", undefined, m.content),
        {
          name: "file",
          label: "Файлды ауыстыру (міндетті емес, ең көбі 2 МБ)",
          type: "file",
          required: false,
        },
      ],
    });
  const openGroup = () =>
    setForm({
      action: "group",
      title: "Жаңа топ",
      fields: [
        field("name", "Топ атауы"),
        field("course", "Курс", "text", undefined, "Робототехника"),
        field("teacher_id", "Жауапты ментор", "select", mentors),
        field("monthly_fee", "Айлық құны, ₸", "number", undefined, "25000"),
      ],
    });
  const openEmployee = () =>
    setForm({
      action: "employee",
      title: "Қызметкер және аккаунт",
      fields: [
        field("name", "Аты-жөні"),
        field("email", "Кіру email-і", "email"),
        field("password", "Бастапқы құпиясөз (кемінде 10 таңба)", "password"),
        field("position", "Лауазымы", "text", undefined, "Ментор"),
        field("role", "Қолжетімділік", "select", [
          { value: "teacher", label: "Ментор" },
          { value: "admin", label: "Әкімші" },
        ]),
      ],
    });
  const openLesson = () =>
    setForm({
      action: "lesson",
      title: "Сабақты жоспарлау",
      fields: [
        field("topic", "Сабақ тақырыбы"),
        field("group_id", "Топ", "select", groups),
        field(
          "teacher_id",
          "Ментор",
          "select",
          mentors,
          state.groups[0]?.teacher_id ?? "",
        ),
        field("lesson_date", "Күні", "date", undefined, state.tomorrow),
        field("lesson_time", "Басталу уақыты", "time", undefined, "16:00"),
        {
          ...field("method_id", "Әдістеме", "select", [
            { value: "", label: "Кейін бекіту" },
            ...methods,
          ]),
          required: false,
        },
        { ...field("room", "Кабинет"), required: false },
      ],
    });
  const editLesson = (l: Lesson) =>
    setForm({
      action: "lesson",
      title: "Сабақ кестесін өзгерту",
      fields: [
        { name: "id", label: "", type: "hidden", value: l.id },
        field("topic", "Сабақ тақырыбы", "text", undefined, l.topic),
        field("group_id", "Топ", "select", groups, l.group_id),
        field("teacher_id", "Ментор", "select", mentors, l.teacher_id),
        field("lesson_date", "Күні", "date", undefined, l.lesson_date),
        field(
          "lesson_time",
          "Басталу уақыты",
          "time",
          undefined,
          l.lesson_time.slice(0, 5),
        ),
        {
          ...field(
            "method_id",
            "Әдістеме",
            "select",
            [{ value: "", label: "Кейін бекіту" }, ...methods],
            l.method_id ?? "",
          ),
          required: false,
        },
        {
          ...field("room", "Кабинет", "text", undefined, l.room),
          required: false,
        },
      ],
    });
  const openMethod = () =>
    setForm({
      action: "method",
      title: "Әдістеме жүктеу",
      fields: [
        field("title", "Әдістеме атауы"),
        field("content", "Сабақ жоспары, мақсат және тапсырмалар", "textarea"),
        {
          name: "file",
          label: "PDF, TXT, PNG, JPG • ең көбі 2 МБ",
          type: "file",
          required: false,
        },
      ],
    });
  const openTask = () =>
    setForm({
      action: "task",
      title: "Қызметкерге тапсырма",
      fields: [
        field("title", "Тапсырма атауы"),
        field("employee_id", "Жауапты қызметкер", "select", employees),
        field("due_date", "Орындау күні", "date", undefined, state.tomorrow),
        {
          ...field("description", "Толық сипаттама", "textarea"),
          required: false,
        },
      ],
    });
  const openCharge = () =>
    setForm({
      action: "charge",
      title: "Айлық төлем шоты",
      fields: [
        field("student_id", "Оқушы", "select", students),
        field(
          "period",
          "Төлем айы",
          "month",
          undefined,
          state.today.slice(0, 7),
        ),
        field("amount", "Сома, ₸", "number", undefined, "25000"),
        field("due_date", "Төлеу мерзімі", "date", undefined, state.today),
      ],
    });
  const cta: Record<string, () => void> = {
    overview: openStudent,
    students: openStudent,
    groups: openGroup,
    team: openEmployee,
    schedule: openLesson,
    methods: openMethod,
    tasks: openTask,
    payments: openCharge,
  };
  const ctaLabel: Record<string, string> = {
    overview: "Оқушы қосу",
    students: "Оқушы қосу",
    groups: "Топ қосу",
    team: "Қызметкер қосу",
    schedule: "Сабақ қосу",
    methods: "Әдістеме жүктеу",
    tasks: "Тапсырма беру",
    payments: "Төлем шотын құру",
  };
  function LessonCard({ lesson }: { lesson: Lesson }) {
    return (
      <article className="lesson-card">
        <div className="lesson-time">
          {lesson.lesson_time.slice(0, 5)}
          <span>{day(lesson.lesson_date)}</span>
        </div>
        <div className="lesson-main">
          <span className="tag">{lesson.group_name}</span>
          <h3>{lesson.topic}</h3>
          <p>
            {lesson.teacher_name} · {lesson.room || "Кабинет көрсетілмеген"}
          </p>
          {lesson.method_id ? (
            <button
              className="text-button"
              onClick={() =>
                setViewMethod(
                  state.methods.find((m) => m.id === lesson.method_id) ?? null,
                )
              }
            >
              <BookOpen size={14} />
              {lesson.method_title}
            </button>
          ) : (
            <span className="status amber">Әдістеме бекітілмеген</span>
          )}
        </div>
        <div className="lesson-actions">
          <span
            className={`status ${lesson.status === "completed" ? "green" : ""}`}
          >
            {lesson.status === "completed" ? "Аяқталды" : "Жоспарда"}
          </span>
          {admin && (
            <button className="text-button" onClick={() => editLesson(lesson)}>
              Кестені өзгерту
            </button>
          )}
          {admin && (
            <button
              className="text-button"
              onClick={() =>
                setForm({
                  action: "assignMethod",
                  title: "Сабаққа әдістеме бекіту",
                  fields: [
                    {
                      name: "lesson_id",
                      label: "",
                      type: "hidden",
                      value: lesson.id,
                    },
                    field(
                      "method_id",
                      "Әдістеме",
                      "select",
                      methods,
                      lesson.method_id ?? "",
                    ),
                  ],
                })
              }
            >
              Әдістеме бекіту
            </button>
          )}
          <Link
            className="text-button"
            href={`/workspace/attendance?lesson=${lesson.id}`}
          >
            Қатысу <ChevronRight size={14} />
          </Link>
        </div>
      </article>
    );
  }
  const empty = (text: string) => (
    <div className="empty">
      <BookOpen size={28} />
      <p>{text}</p>
    </div>
  );
  return (
    <main lang="kk" className="center-app crm-workspace">
      <aside className="center-sidebar">
        <Link href="/workspace" className="center-logo">
          <BrandMark key={brandVersion} version={brandVersion} />
        </Link>
        <div className="center-label">S7 ROBOTICS · ЖЕКЕ CRM</div>
        <nav aria-label="Негізгі навигация">
          {navigation
            .filter(
              ([key]) =>
                admin || !["team", "payments", "contracts"].includes(key),
            )
            .map(([key, label, Icon]) => (
              <Link
                key={key}
                href={key === "overview" ? "/workspace" : `/workspace/${key}`}
                className={section === key ? "active" : ""}
                aria-current={section === key ? "page" : undefined}
              >
                <Icon size={18} />
                {label}
                {key === "tasks" && todo.length > 0 && <b>{todo.length}</b>}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="database-dot" /> S7 Robotics командасы
          <p>Оқу орталығын басқару</p>
          <div className="account">
            <div className="avatar">{initials(state.account.name)}</div>
            <div>
              <strong>{state.account.name}</strong>
              <small>{admin ? "Әкімші" : "Ментор"}</small>
            </div>
            <button
              aria-label="Аккаунттан шығу"
              title="Аккаунттан шығу"
              onClick={() => act({ action: "logout" })}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <section className="center-content">
        <header className="center-topbar">
          <div className="breadcrumb">
            Жұмыс кеңістігі <ChevronRight size={13} />{" "}
            <strong>{navigation.find((n) => n[0] === section)?.[1]}</strong>
          </div>
          <div className="topbar-right">
            <span>{day(state.today)}</span>
            <Link
              href="/workspace/schedule"
              className="notification"
              title="Ертеңгі сабақтар"
            >
              <Bell size={18} />
              {tomorrowLessons.length > 0 && <i />}
            </Link>
            <div className="avatar small">{initials(state.account.name)}</div>
          </div>
        </header>
        <div className="center-body" key={section}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                S7 ROBOTICS / {admin ? "БАСҚАРУ" : "МҰҒАЛІМ КАБИНЕТІ"}
              </div>
              <h1>
                {section === "overview"
                  ? "Басқару панелі"
                  : navigation.find((n) => n[0] === section)?.[1]}
              </h1>
              <p className="muted">
                {
                  {
                    overview:
                      "Орталықтың негізгі көрсеткіштері және бүгінгі сабақтар.",
                    students:
                      "Әр оқушыға жеке QR код және басып шығарылатын бейдж.",
                    groups: "Оқу топтары, жауапты мұғалімдер және курс құны.",
                    team: "Қызметкерлер, рөлдер және жеке кіру аккаунттары.",
                    schedule:
                      "Сабақты жоспарлаңыз, мұғалім мен әдістемені бекітіңіз.",
                    attendance:
                      "Сабақты таңдаңыз. Бейджді сканерлеңіз. Қатысу сақталады.",
                    methods:
                      "Әдістемені осында жүктеп, кестедегі сабаққа бекітіңіз.",
                    tasks: "Кім, нені және қай күнге дейін орындайды.",
                    payments: "Айлық шоттар, төленген ақша және қарыз қалдығы.",
                    contracts:
                      "Оқушы карточкасындағы деректерден договор құру және сақтау.",
                    reports: "Әр оқушының қатысу күндері мен жеке есебі.",
                    messages:
                      "Ата-аналарға келмеу мен төлем туралы дайын хабарламалар.",
                  }[section]
                }
              </p>
            </div>
            {admin && cta[section] && (
              <button className="primary" onClick={cta[section]}>
                <Plus size={17} />
                {ctaLabel[section]}
              </button>
            )}
          </div>
          {notice && (
            <div role="status" className="toast">
              <CheckCheck size={18} />
              {notice}
              <button onClick={() => setNotice("")} aria-label="Жабу">
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error-banner">
              {error}
              <button onClick={() => setError("")} aria-label="Қатені жабу">
                <X size={16} />
              </button>
            </div>
          )}
          {badgeId && (
            <div className="success-banner">
              <QrCode size={22} />
              <div>
                <strong>Оқушының жеке бейджі дайын</strong>
                <p>Басып шығарыңыз немесе PDF ретінде сақтаңыз.</p>
              </div>
              <a
                className="primary"
                href={`/api/center/badge?id=${badgeId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Printer size={16} />
                Бейджді ашу
              </a>
              <button
                className="icon-button"
                onClick={() => setBadgeId("")}
                aria-label="Бейдж хабарламасын жабу"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {section === "overview" && (
            <>
              <div className="stats-grid">
                {[
                  [
                    GraduationCap,
                    "Оқушылар",
                    state.students.length,
                    "Жеке QR бейджі бар",
                  ],
                  [
                    Users,
                    "Оқу топтары",
                    state.groups.length,
                    "Робототехника курстары",
                  ],
                  [
                    CalendarDays,
                    "Бүгінгі сабақтар",
                    todayLessons.length,
                    `${tomorrowLessons.length} сабақ ертең`,
                  ],
                  [
                    admin ? CreditCard : ClipboardList,
                    admin ? "Төлем қалдығы" : "Менің тапсырмаларым",
                    admin ? money(debt) : todo.length,
                    admin ? "Айлық шоттар бойынша" : "Орындауды күтіп тұр",
                  ],
                ].map(([Icon, label, value, caption]) => {
                  const I = Icon as typeof Users;
                  return (
                    <article className="stat-card" key={String(label)}>
                      <div>
                        <span>{String(label)}</span>
                        <I size={19} />
                      </div>
                      <strong>{String(value)}</strong>
                      <p>{String(caption)}</p>
                    </article>
                  );
                })}
              </div>
              <div className="dashboard-columns">
                <div>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        Бүгінгі сабақтар <span>{todayLessons.length}</span>
                      </h2>
                      <Link href="/workspace/schedule">
                        Кестені ашу <ArrowUpRight size={15} />
                      </Link>
                    </div>
                    {todayLessons.length
                      ? todayLessons.map((l) => (
                          <LessonCard key={l.id} lesson={l} />
                        ))
                      : empty("Бүгінге сабақ жоспарланбаған")}
                  </section>
                  <section className="panel tomorrow-panel">
                    <div className="panel-heading">
                      <h2>
                        <BookOpen size={19} /> Ертеңге дайындық
                      </h2>
                      <span className="tag">{day(state.tomorrow)}</span>
                    </div>
                    <p className="muted panel-description">
                      Сабаққа бекітілген әдістемелер күн сайын осы жерде жаңарып
                      тұрады.
                    </p>
                    {tomorrowLessons.length
                      ? tomorrowLessons.map((l) => (
                          <LessonCard key={l.id} lesson={l} />
                        ))
                      : empty("Ертеңге сабақ жоспарланбаған")}
                  </section>
                </div>
                <div>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>Жақын тапсырмалар</h2>
                      <Link href="/workspace/tasks">
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                    {todo.slice(0, 5).map((t) => (
                      <div className="mini-task" key={t.id}>
                        <ClipboardList size={17} />
                        <div>
                          <strong>{t.title}</strong>
                          <p>
                            {t.employee_name} · {day(t.due_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!todo.length && empty("Ашық тапсырмалар жоқ")}
                  </section>
                  <section className="panel crm-shortcuts">
                    <div className="panel-heading">
                      <h2>Жылдам өту</h2>
                    </div>
                    <Link href="/workspace/attendance">
                      <QrCode size={17} />
                      <span>Қатысуды белгілеу</span>
                      <ChevronRight size={15} />
                    </Link>
                    <Link href="/workspace/students">
                      <GraduationCap size={17} />
                      <span>Оқушылар тізімі</span>
                      <ChevronRight size={15} />
                    </Link>
                    <Link href="/workspace/schedule">
                      <CalendarDays size={17} />
                      <span>Сабақ кестесі</span>
                      <ChevronRight size={15} />
                    </Link>
                    <Link href="/workspace/messages">
                      <MessageCircle size={17} />
                      <span>WhatsApp хабарламалары</span>
                      <ChevronRight size={15} />
                    </Link>
                  </section>
                </div>
              </div>
            </>
          )}
          {[
            "students",
            "team",
            "groups",
            "methods",
            "tasks",
            "schedule",
          ].includes(section) && (
            <div className="search-row">
              <Search size={17} />
              <input
                aria-label="Іздеу"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Атауы бойынша іздеу…"
              />
              <span>
                {section === "students" ? `${state.students.length} оқушы` : ""}
              </span>
            </div>
          )}
          {section === "students" && (
            <section className="panel table-panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Оқушы</th>
                      <th>Тобы</th>
                      <th>Ата-анасы</th>
                      <th>WhatsApp</th>
                      <th>Жеке бейдж</th>
                      <th>Есеп</th>
                      {admin && <th>Әрекеттер</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {state.students
                      .filter((s) =>
                        match(`${s.name} ${s.parent_name} ${s.group_name}`),
                      )
                      .map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div className="name-cell">
                              <div className="avatar mint">
                                {initials(s.name)}
                              </div>
                              <div>
                                <strong>{s.name}</strong>
                                {s.student_type === "trial" && (
                                  <span className="tag">Пробник</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="tag">
                              {s.group_name || "Топсыз"}
                            </span>
                          </td>
                          <td>{s.parent_name || "—"}</td>
                          <td>{s.phone ? `+${s.phone}` : "—"}</td>
                          <td>
                            <a
                              className="secondary compact"
                              target="_blank"
                              rel="noreferrer"
                              href={`/api/center/badge?id=${s.id}`}
                            >
                              <QrCode size={16} />
                              QR бейдж <Printer size={14} />
                            </a>
                          </td>
                          <td>
                            <Link
                              className="secondary compact"
                              href={`/workspace/reports?student=${s.id}`}
                            >
                              <FileText size={15} />
                              Есеп
                            </Link>
                          </td>
                          {admin && (
                            <td>
                              <div className="inline-actions">
                                <button
                                  className="secondary compact"
                                  onClick={() => editStudent(s)}
                                >
                                  Өзгерту
                                </button>
                                <Link
                                  className="secondary compact"
                                  href={`/workspace/contracts?student=${s.id}`}
                                >
                                  <FileText size={15} />
                                  Договор
                                </Link>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!state.students.length &&
                empty(
                  "Алғашқы оқушыны қосыңыз. Жеке QR бейдж автоматты түрде жасалады.",
                )}
            </section>
          )}
          {section === "groups" && (
            <div className="card-grid">
              {state.groups
                .filter((g) => match(g.name))
                .map((g) => (
                  <article className="panel group-card" key={g.id}>
                    <div className="group-icon">
                      <Users size={24} />
                    </div>
                    <span className="tag">{g.course}</span>
                    <h2>{g.name}</h2>
                    <p className="muted">
                      {state.accounts.find((a) => a.id === g.teacher_id)
                        ?.name ??
                        (g.teacher_id
                          ? "Жауапты ментор бекітілген"
                          : "Ментор тағайындалмаған")}
                    </p>
                    {admin && (
                      <button
                        className="text-button"
                        onClick={() => editGroup(g)}
                      >
                        Топты өзгерту
                      </button>
                    )}
                    <div className="group-footer">
                      <strong>
                        {
                          state.students.filter((s) => s.group_id === g.id)
                            .length
                        }{" "}
                        оқушы
                      </strong>
                      <span>
                        {g.monthly_fee === null
                          ? "Құны көрсетілмеген"
                          : `${money(g.monthly_fee)} / ай`}
                      </span>
                    </div>
                  </article>
                ))}
              {!state.groups.length && empty("Алдымен оқу тобын құрыңыз")}
            </div>
          )}
          {section === "team" && (
            <section className="panel table-panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Қызметкер</th>
                      <th>Лауазымы</th>
                      <th>Email / логин</th>
                      <th>Рөлі</th>
                      <th>Аккаунт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.accounts
                      .filter((a) => match(`${a.name} ${a.email}`))
                      .map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="name-cell">
                              <div className="avatar">{initials(a.name)}</div>
                              <div>
                                <strong>{a.name}</strong>
                                <button
                                  className="text-button block"
                                  onClick={() =>
                                    setForm({
                                      action: "employeeProfile",
                                      title: "Қызметкерді өзгерту",
                                      fields: [
                                        {
                                          name: "id",
                                          label: "",
                                          type: "hidden",
                                          value: a.id,
                                        },
                                        field(
                                          "name",
                                          "Аты-жөні",
                                          "text",
                                          undefined,
                                          a.name,
                                        ),
                                        field(
                                          "position",
                                          "Лауазымы",
                                          "text",
                                          undefined,
                                          a.position,
                                        ),
                                      ],
                                    })
                                  }
                                >
                                  Атын өзгерту
                                </button>
                              </div>
                            </div>
                          </td>
                          <td>{a.position}</td>
                          <td>{a.email}</td>
                          <td>
                            <span className="status green">
                              {a.role === "admin" ? "Әкімші" : "Ментор"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() =>
                                setForm({
                                  action: "password",
                                  title: `Құпиясөз: ${a.name}`,
                                  fields: [
                                    {
                                      name: "id",
                                      label: "",
                                      type: "hidden",
                                      value: a.id,
                                    },
                                    field(
                                      "password",
                                      "Жаңа құпиясөз (кемінде 10 таңба)",
                                      "password",
                                    ),
                                  ],
                                })
                              }
                            >
                              Құпиясөзді жаңарту
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {section === "schedule" && (
            <>
              <div className="schedule-notice">
                <Bell size={20} />
                <div>
                  <strong>Ертеңгі әдістемелер дайын ба?</strong>
                  <p>
                    {tomorrowLessons.length} сабақ жоспарланған ·{" "}
                    {tomorrowLessons.filter((l) => !l.method_id).length} сабаққа
                    әдістеме бекітілмеген. Мұғалім өз кабинетінде күн сайын
                    жаңарған тізімді көреді.
                  </p>
                </div>
              </div>
              <section className="panel">
                {state.lessons
                  .filter((l) =>
                    match(`${l.topic} ${l.group_name} ${l.teacher_name}`),
                  )
                  .map((l) => (
                    <LessonCard key={l.id} lesson={l} />
                  ))}
                {!state.lessons.length &&
                  empty("Сабақтарды жоспарлауды бастаңыз")}
              </section>
            </>
          )}
          {section === "methods" && (
            <div className="card-grid">
              {state.methods
                .filter((m) => match(m.title))
                .map((m) => (
                  <article className="panel method-card" key={m.id}>
                    <div className="file-icon">
                      <FileText size={24} />
                    </div>
                    <span className="eyebrow">САБАҚ ӘДІСТЕМЕСІ</span>
                    <h2>{m.title}</h2>
                    <p className="method-excerpt">{m.content.slice(0, 160)}</p>
                    <div className="method-footer">
                      {admin && (
                        <button
                          className="text-button"
                          onClick={() => editMethod(m)}
                        >
                          Өзгерту
                        </button>
                      )}
                      <button
                        className="text-button"
                        onClick={() => setViewMethod(m)}
                      >
                        Әдістемені оқу <ArrowUpRight size={16} />
                      </button>
                      {m.file_name && (
                        <a
                          className="icon-button"
                          title={m.file_name}
                          href={`/api/center?method=${m.id}`}
                        >
                          <Download size={17} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              {!state.methods.length &&
                empty(
                  admin
                    ? "Алғашқы әдістемені жүктеңіз"
                    : "Сабақтарыңызға әдістеме әлі бекітілмеген",
                )}
            </div>
          )}
          {section === "tasks" && (
            <section className="panel">
              {state.tasks
                .filter((t) => match(`${t.title} ${t.employee_name}`))
                .map((t) => (
                  <article className="task-row" key={t.id}>
                    <button
                      disabled={busy}
                      className={`task-check ${t.status === "done" ? "checked" : ""}`}
                      aria-label={
                        t.status === "done"
                          ? "Тапсырманы қайта ашу"
                          : "Тапсырманы орындау"
                      }
                      onClick={() =>
                        act({
                          action: "taskStatus",
                          id: t.id,
                          status: t.status === "done" ? "todo" : "done",
                        })
                      }
                    >
                      {t.status === "done" && <Check size={16} />}
                    </button>
                    <div className="task-info">
                      <h3 className={t.status === "done" ? "done-text" : ""}>
                        {t.title}
                      </h3>
                      <p>{t.description}</p>
                      <span>{t.employee_name}</span>
                    </div>
                    <div>
                      <span
                        className={`status ${t.status === "done" ? "green" : t.due_date < state.today ? "red" : "amber"}`}
                      >
                        {t.status === "done"
                          ? "Орындалды"
                          : t.due_date < state.today
                            ? "Мерзімі өтті"
                            : "Орындау керек"}
                      </span>
                      <p className="muted tiny">{day(t.due_date)}</p>
                    </div>
                  </article>
                ))}
              {!state.tasks.length && empty("Тапсырмалар әлі жоқ")}
            </section>
          )}
          {section === "attendance" && (
            <>
              <section className="panel lesson-picker">
                <label>
                  Қатысу белгіленетін сабақ
                  <select
                    value={lessonId}
                    onChange={(e) => setLessonId(e.target.value)}
                  >
                    <option value="">Сабақты таңдаңыз</option>
                    {state.lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lesson_date} · {l.lesson_time.slice(0, 5)} ·{" "}
                        {l.group_name} · {l.topic}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <span
                    className={`status ${selected.status === "completed" ? "green" : "amber"}`}
                  >
                    {selected.status === "completed"
                      ? "Сабақ аяқталған"
                      : "Қатысу қабылдануда"}
                  </span>
                )}
              </section>
              {selected ? (
                <div className="attendance-columns">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        <QrCode size={20} /> QR сканер
                      </h2>
                    </div>
                    {selected.status === "planned" ? (
                      <QrScanner
                        key={selected.id}
                        onScan={async (token) => {
                          await act({
                            action: "scan",
                            lesson_id: selected.id,
                            token,
                          });
                        }}
                      />
                    ) : (
                      <div className="empty">
                        <CheckCheck size={32} />
                        <h3>Сабақ аяқталды</h3>
                        <p>
                          Қажет болса, оң жақтағы тізімнен қатысуды түзете
                          аласыз.
                        </p>
                      </div>
                    )}
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>{selected.group_name}</h2>
                      <span className="tag">
                        {
                          state.attendance.filter(
                            (a) =>
                              a.lesson_id === selected.id &&
                              a.status === "present",
                          ).length
                        }{" "}
                        келді
                      </span>
                    </div>
                    {lessonRoster.map((s) => {
                      const a = state.attendance.find(
                        (a) =>
                          a.lesson_id === selected.id && a.student_id === s.id,
                      );
                      return (
                        <div className="attendance-row" key={s.id}>
                          <div className="avatar mint">{initials(s.name)}</div>
                          <div className="attendance-name">
                            <strong>{s.name}</strong>
                            <span
                              className={`status ${a?.status === "present" ? "green" : a?.status === "absent" ? "red" : ""}`}
                            >
                              {a?.status === "present"
                                ? "Келді"
                                : a?.status === "absent"
                                  ? "Келмеді"
                                  : "Белгіленбеген"}
                            </span>
                          </div>
                          <div className="attendance-actions">
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                act({
                                  action: "attendanceStatus",
                                  lesson_id: selected.id,
                                  student_id: s.id,
                                  status:
                                    a?.status === "present"
                                      ? "absent"
                                      : "present",
                                })
                              }
                            >
                              {a?.status === "present" ? "Келмеді" : "Келді"}
                            </button>
                            {a?.status === "absent" && (
                              <button
                                className="whatsapp-button"
                                disabled={busy}
                                title="Келмегені туралы хабарлама дайындау"
                                onClick={() =>
                                  act({
                                    action: "draft",
                                    kind: "absence",
                                    student_id: s.id,
                                    lesson_id: selected.id,
                                  })
                                }
                              >
                                <MessageCircle size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!lessonRoster.length && empty("Бұл топта әлі оқушы жоқ")}
                    {selected.status === "planned" && (
                      <div className="close-lesson">
                        <p>
                          Сабақты жапқанда белгіленбеген оқушылар «келмеді» деп
                          сақталады.
                        </p>
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => setCloseConfirm(true)}
                        >
                          <CheckCheck size={17} />
                          Сабақты аяқтау
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                empty("Қатысуды бастау үшін сабақты таңдаңыз")
              )}
            </>
          )}
          {section === "payments" && (
            <>
              <div className="stats-grid three">
                <article className="stat-card">
                  <span>Барлық шоттар</span>
                  <strong>
                    {money(
                      state.charges.reduce((a, c) => a + Number(c.amount), 0),
                    )}
                  </strong>
                </article>
                <article className="stat-card">
                  <span>Төленді</span>
                  <strong className="green-text">
                    {money(
                      state.payments.reduce((a, p) => a + Number(p.amount), 0),
                    )}
                  </strong>
                </article>
                <article className="stat-card">
                  <span>Төлем қалдығы</span>
                  <strong>{money(debt)}</strong>
                </article>
              </div>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <h2>Айлық шоттар</h2>
                  <span className="tag">KZT · ₸</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Оқушы / ай</th>
                        <th>Есептелді</th>
                        <th>Төленді</th>
                        <th>Қалдық</th>
                        <th>Мерзімі / төленген күн</th>
                        <th>Әрекет</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.charges.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.student_name}</strong>
                            <small className="block muted">{c.period}</small>
                          </td>
                          <td>{money(c.amount)}</td>
                          <td>{money(c.paid)}</td>
                          <td>
                            <span
                              className={`status ${Number(c.balance) > 0 ? "amber" : "green"}`}
                            >
                              {Number(c.balance) === 0 ? "Оплачен" : Number(c.paid) > 0 ? `Ішінара · ${money(c.balance)}` : `Төленбеген · ${money(c.balance)}`}
                            </span>
                          </td>
                          <td>{day(c.due_date)}
                            {state.payments.filter(p => p.charge_id === c.id).map(p => (
                              <small className="block muted" key={p.id}>Төленді: {day(p.paid_at)} · {money(p.amount)}</small>
                            ))}
                          </td>
                          <td>
                            <div className="inline-actions">
                              {Number(c.paid) > 0 && (
                                <button className="secondary compact" onClick={() => {
                                  let phone = c.phone.replace(/\D/g, "");
                                  if (phone.length === 11 && phone.startsWith("8")) phone = `7${phone.slice(1)}`;
                                  if (!/^[1-9]\d{9,14}$/.test(phone)) { setError("Оқушы карточкасына ата-ананың дұрыс телефон нөмірін енгізіңіз."); return; }
                                  const dates = state.payments.filter(p => p.charge_id === c.id).map(p => `${day(p.paid_at)} — ${money(p.amount)}`).join("\n");
                                  setDraft({phone, body: `Сәлеметсіз бе! S7 Robotics.\nОқушы: ${c.student_name}\nКезең: ${c.period}\nТөлем қабылданды: ${money(c.paid)}\n${dates}\nМәртебе: ${Number(c.balance) === 0 ? "Оплачен" : "Ішінара төленді"}\nҚалдық: ${money(c.balance)}\nРақмет!`});
                                }}><MessageCircle size={16} /> Төлем туралы WhatsApp</button>
                              )}
                              {Number(c.balance) > 0 && (
                                <>
                                  <button
                                    className="secondary compact"
                                    onClick={() =>
                                      setForm({
                                        action: "payment",
                                        title: `Төлем: ${c.student_name}`,
                                        fields: [
                                          {
                                            name: "charge_id",
                                            label: "",
                                            type: "hidden",
                                            value: c.id,
                                          },
                                          field(
                                            "amount",
                                            `Сома, ₸ (қалдық ${money(c.balance)})`,
                                            "number",
                                            undefined,
                                            c.balance,
                                          ),
                                          field(
                                            "paid_at",
                                            "Төленген күні",
                                            "date",
                                            undefined,
                                            state.today,
                                          ),
                                          {
                                            ...field(
                                              "note",
                                              "Ескертпе / төлем тәсілі",
                                            ),
                                            required: false,
                                          },
                                        ],
                                      })
                                    }
                                  >
                                    Төлем қабылдау
                                  </button>
                                  <button
                                    className="whatsapp-button"
                                    disabled={busy}
                                    title="Төлем туралы хабарлама дайындау"
                                    onClick={() =>
                                      act({
                                        action: "draft",
                                        kind: "payment",
                                        student_id: c.student_id,
                                        charge_id: c.id,
                                      })
                                    }
                                  >
                                    <MessageCircle size={17} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!state.charges.length &&
                  empty("Оқушыға айлық төлем шотын құрыңыз")}
              </section>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <h2>Төлемдер тарихы</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Оқушы</th>
                        <th>Сома</th>
                        <th>Күні</th>
                        <th>Ескертпе</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.student_name}</td>
                          <td className="green-text">+{money(p.amount)}</td>
                          <td>{day(p.paid_at)}</td>
                          <td>{p.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!state.payments.length && empty("Төлем әлі қабылданбаған")}
              </section>
            </>
          )}
          {section === "contracts" && admin && (
            <Contracts
              key={initialStudentId ?? "all"}
              state={state}
              requestedStudentId={initialStudentId}
              onAction={act}
            />
          )}
          {section === "reports" && (
            <StudentReport
              key={initialStudentId ?? "all"}
              state={state}
              requestedStudentId={initialStudentId}
            />
          )}
          {section === "messages" && (
            <>
              <div className="schedule-notice">
                <MessageCircle size={22} />
                <div>
                  <strong>Дайын мәтін → WhatsApp → жіберу</strong>
                  <p>
                    Келмеу туралы хабарлама қатысу бетінен, төлем ескертуі төлем
                    бетінен жасалады. Мәтінді өзгертіп, WhatsApp-та өзіңіз
                    жібересіз. Автоматты жіберу қосылмаған.
                  </p>
                </div>
              </div>
              <section className="panel">
                {state.drafts.map((d: Draft) => (
                  <article className="draft-row" key={d.id}>
                    <div className="draft-header">
                      <strong>{d.student_name}</strong>
                      <span
                        className={`status ${d.kind === "absence" ? "red" : "amber"}`}
                      >
                        {d.kind === "absence"
                          ? "Сабаққа келмеді"
                          : "Төлем ескертуі"}
                      </span>
                      <span className="muted tiny">
                        Дайын мәтін · жіберілуі расталмаған
                      </span>
                    </div>
                    <p>{d.body}</p>
                    <button
                      className="whatsapp-button"
                      onClick={() => setDraft({ body: d.body, phone: d.phone })}
                    >
                      <MessageCircle size={16} />
                      Мәтінді ашу
                    </button>
                  </article>
                ))}
                {!state.drafts.length &&
                  empty("Дайындалған хабарламалар осында сақталады")}
              </section>
            </>
          )}
          {section === "team" && admin && (
            <BrandingSettings onSaved={() => setBrandVersion((v) => v + 1)} />
          )}
          <footer className="center-footer">
            S7 Robotics · Жеке CRM{" "}
            <span>Деректер осы компьютерде сақталады</span>
          </footer>
        </div>
      </section>
      {form && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setForm(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
            className="center-modal"
          >
            <div className="modal-heading">
              <h2 id="form-title">{form.title}</h2>
              <button
                className="icon-button"
                disabled={busy}
                onClick={() => setForm(null)}
                aria-label="Жабу"
              >
                <X />
              </button>
            </div>
            <form
              key={form.action + form.title}
              onSubmit={async (e) => {
                e.preventDefault();
                const createContract =
                  (e.nativeEvent as SubmitEvent).submitter instanceof
                    HTMLButtonElement &&
                  (
                    (e.nativeEvent as SubmitEvent)
                      .submitter as HTMLButtonElement
                  ).value === "contract";
                const f = new FormData(e.currentTarget);
                const input: Record<string, unknown> = { action: form.action };
                for (const [key, value] of f) {
                  if (key !== "file") input[key] = value;
                }
                const file = f.get("file");
                if (file instanceof File && file.size) {
                  if (file.size > 2 * 1024 * 1024) {
                    setError("Файл 2 МБ-тан аспауы керек");
                    return;
                  }
                  try {
                    input.file_name = file.name;
                    input.file_type = file.type || "text/plain";
                    input.file_data = await new Promise<string>(
                      (resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(Error("Файл оқылмады"));
                        reader.readAsDataURL(file);
                      },
                    );
                  } catch {
                    setError("Файл оқылмады");
                    return;
                  }
                }
                const saved = await act(input);
                if (saved) {
                  setForm(null);
                  if (createContract && saved.studentId)
                    router.push(
                      `/workspace/contracts?student=${saved.studentId}`,
                    );
                }
              }}
            >
              {form.fields.map((f) =>
                f.type === "hidden" ? (
                  <input
                    key={f.name}
                    name={f.name}
                    type="hidden"
                    value={f.value}
                  />
                ) : (
                  <label key={f.name}>
                    {f.label}
                    {f.required !== false && <em> *</em>}
                    {f.type === "select" ? (
                      <select
                        name={f.name}
                        onChange={(event) => {
                          if (form.action !== "lesson" || f.name !== "group_id")
                            return;
                          const group = state.groups.find(
                            (g) => g.id === event.currentTarget.value,
                          );
                          const mentorSelect =
                            event.currentTarget.form?.elements.namedItem(
                              "teacher_id",
                            );
                          if (mentorSelect instanceof HTMLSelectElement)
                            mentorSelect.value = group?.teacher_id ?? "";
                        }}
                        defaultValue={f.value ?? f.options?.[0]?.value ?? ""}
                        required={f.required !== false}
                      >
                        {f.value === "" &&
                        f.options?.length &&
                        !f.options.some((o) => o.value === "") ? (
                          <option value="">Таңдаңыз</option>
                        ) : null}
                        {!f.options?.length && (
                          <option value="">
                            Алдымен байланысты жазбаны қосыңыз
                          </option>
                        )}
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        rows={7}
                        defaultValue={f.value}
                        required={f.required !== false}
                        maxLength={f.name === "content" ? 50000 : 5000}
                      />
                    ) : (
                      <input
                        name={f.name}
                        type={f.type ?? "text"}
                        defaultValue={f.type === "file" ? undefined : f.value}
                        required={f.required !== false}
                        min={f.type === "number" ? 0 : undefined}
                        step={f.type === "number" ? "0.01" : undefined}
                        minLength={f.type === "password" ? 10 : undefined}
                        maxLength={
                          f.type === "password"
                            ? 128
                            : f.type === "tel"
                              ? 20
                              : 300
                        }
                        autoComplete={
                          f.type === "password" ? "new-password" : undefined
                        }
                        accept={
                          f.type === "file"
                            ? ".pdf,.txt,.png,.jpg,.jpeg"
                            : undefined
                        }
                      />
                    )}
                  </label>
                ),
              )}
              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <div className="modal-buttons">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Бас тарту
                </button>
                <button className="primary" disabled={busy}>
                  {busy ? "Сақталуда…" : "Сақтау"}
                </button>
                {form.action === "student" && (
                  <button
                    className="primary"
                    name="next"
                    value="contract"
                    disabled={busy}
                  >
                    <FileText size={15} />
                    Сақтау және договор құру
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
      {viewMethod && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Әдістеме"
            className="center-modal wide"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">САБАҚ ӘДІСТЕМЕСІ</span>
                <h2>{viewMethod.title}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setViewMethod(null)}
                aria-label="Жабу"
              >
                <X />
              </button>
            </div>
            <div className="method-content">{viewMethod.content}</div>
            {viewMethod.file_name && (
              <a
                className="primary"
                href={`/api/center?method=${viewMethod.id}`}
              >
                <Download size={17} />
                {viewMethod.file_name}
              </a>
            )}
          </section>
        </div>
      )}
      {draft && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="WhatsApp хабарламасы"
            className="center-modal"
          >
            <div className="modal-heading">
              <h2>Ата-анаға хабарлама</h2>
              <button
                className="icon-button"
                onClick={() => setDraft(null)}
                aria-label="Жабу"
              >
                <X />
              </button>
            </div>
            <p className="muted">
              Алушы: +{draft.phone}. Мәтінді тексеріп, қажет болса өзгертіңіз.
            </p>
            <label>
              Хабарлама мәтіні
              <textarea
                rows={8}
                value={draft.body}
                maxLength={4000}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
            <a
              className="primary whatsapp-primary"
              href={`https://wa.me/${draft.phone}?text=${encodeURIComponent(draft.body)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              WhatsApp-та ашу
            </a>
            <p className="muted tiny">
              Бұл әрекет WhatsApp-ты ашады. Хабарлама тек «Жіберу» батырмасын
              басқанда кетеді.
            </p>
          </section>
        </div>
      )}
      {closeConfirm && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Сабақты аяқтау"
            className="center-modal"
          >
            <h2>Сабақты аяқтаймыз ба?</h2>
            <p className="muted">
              QR сканерленбеген және қолмен белгіленбеген оқушылар «келмеді» деп
              сақталады. Кейін қатысуды қолмен түзетуге болады.
            </p>
            <div className="modal-buttons">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setCloseConfirm(false)}
              >
                Артқа
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  if (await act({ action: "closeLesson", lesson_id: lessonId }))
                    setCloseConfirm(false);
                }}
              >
                Сабақты аяқтау
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
