export type RoboticsModuleKey =
  | "students"
  | "payments"
  | "attendance"
  | "schedule"
  | "trial-lessons"
  | "subscriptions"
  | "groups"
  | "mentors"
  | "families"
  | "feedback"
  | "learning"
  | "tasks"
  | "inventory"
  | "methods"
  | "salaries"
  | "team"
  | "reports"
  | "settings";

export type RoboticsTableName =
  | "robotics_students"
  | "robotics_payments"
  | "robotics_attendance"
  | "robotics_lessons"
  | "robotics_trial_lessons"
  | "robotics_subscriptions"
  | "robotics_groups"
  | "robotics_mentors"
  | "robotics_families"
  | "robotics_feedback"
  | "robotics_learning"
  | "robotics_tasks"
  | "robotics_inventory"
  | "robotics_methods"
  | "robotics_salaries"
  | "robotics_team";

export type RoboticsField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "email" | "tel" | "textarea" | "select";
  options?: string[];
  required?: boolean;
};

export type RoboticsModule = {
  key: RoboticsModuleKey;
  title: string;
  description: string;
  href: string;
  table?: RoboticsTableName;
  fields: RoboticsField[];
  columns: string[];
};


export const roboticsNav = [
  ["Ученики", "/dashboard/education/students"],
  ["Оплаты", "/dashboard/education/payments"],
  ["Посещаемость", "/dashboard/education/attendance"],
  ["Расписание", "/dashboard/education/schedule"],
  ["Пробные уроки", "/dashboard/education/trial-lessons"],
  ["Абонементы", "/dashboard/education/subscriptions"],
  ["Группы", "/dashboard/education/groups"],
  ["Журнал ментора", "/dashboard/education/mentor-journal"],
  ["Менторы", "/dashboard/education/mentors"],
  ["Договор", "/dashboard/education/contract"],
  ["Семьи", "/dashboard/education/families"],
  ["Фидбек", "/dashboard/education/feedback"],
  ["Обучение", "/dashboard/education/learning"],
  ["Задачи", "/dashboard/education/tasks"],
  ["Инвентарь", "/dashboard/education/inventory"],
  ["Методика", "/dashboard/education/methods"],
  ["Зарплаты", "/dashboard/education/salaries"],
  ["Команда", "/dashboard/education/team"],
  ["Управление сотрудниками", "/dashboard/employees"],
  ["Отчёты", "/dashboard/education/reports"],
  ["Настройки", "/dashboard/settings"],
] as const;

export const roboticsModules: Record<RoboticsModuleKey, RoboticsModule> = {
  students: {
    key: "students",
    title: "Ученики",
    description: "База учеников, карточки, прогресс, посещаемость, оплаты и PDF карточка.",
    href: "/dashboard/education/students",
    table: "robotics_students",
    columns: ["first_name", "last_name", "parent_name", "parent_phone", "group_name", "mentor_name", "status"],
    fields: [
      { name: "photo_url", label: "Фото URL", required: false },
      { name: "first_name", label: "Имя" },
      { name: "last_name", label: "Фамилия" },
      { name: "birth_date", label: "Дата рождения", type: "date", required: false },
      { name: "parent_name", label: "Родитель" },
      { name: "parent_phone", label: "Телефон родителя", type: "tel" },
      { name: "whatsapp", label: "WhatsApp", required: false },
      { name: "email", label: "Email", type: "email", required: false },
      { name: "school", label: "Школа", required: false },
      { name: "grade", label: "Класс", required: false },
      { name: "group_name", label: "Группа", required: false },
      { name: "mentor_name", label: "Ментор", required: false },
      { name: "start_date", label: "Дата начала", type: "date", required: false },
      { name: "status", label: "Статус", type: "select", options: ["active", "paused", "trial", "archived"] },
      { name: "notes", label: "Заметки", type: "textarea", required: false },
    ],
  },
  payments: {
    key: "payments",
    title: "Оплаты",
    description: "Оборот, оплаты за месяц, задолженности, PDF/Excel экспорт.",
    href: "/dashboard/education/payments",
    table: "robotics_payments",
    columns: ["student_name", "group_name", "amount", "paid_at", "method", "status"],
    fields: [
      { name: "student_name", label: "Ученик" },
      { name: "group_name", label: "Группа", required: false },
      { name: "amount", label: "Сумма", type: "number" },
      { name: "paid_at", label: "Дата", type: "date" },
      { name: "method", label: "Способ оплаты", type: "select", options: ["Kaspi", "наличные", "карта", "перевод"] },
      { name: "status", label: "Статус", type: "select", options: ["оплачено", "не оплачено", "частично"] },
      { name: "comment", label: "Комментарий", type: "textarea", required: false },
    ],
  },
  attendance: {
    key: "attendance",
    title: "Посещаемость",
    description: "Журнал посещаемости со статусами и подсветкой 8 пропусков подряд.",
    href: "/dashboard/education/attendance",
    table: "robotics_attendance",
    columns: ["student_name", "lesson_date", "status", "group_name", "mentor_name"],
    fields: [
      { name: "student_name", label: "Ученик" },
      { name: "lesson_date", label: "Дата занятия", type: "date" },
      { name: "status", label: "Статус", type: "select", options: ["присутствовал", "отсутствовал", "опоздал", "уважительный"] },
      { name: "group_name", label: "Группа", required: false },
      { name: "mentor_name", label: "Ментор", required: false },
      { name: "comment", label: "Комментарий", type: "textarea", required: false },
    ],
  },
  schedule: {
    key: "schedule",
    title: "Расписание",
    description: "Календарь день/неделя/месяц с группой, кабинетом, ментором и темой.",
    href: "/dashboard/education/schedule",
    table: "robotics_lessons",
    columns: ["lesson_date", "lesson_time", "lesson_end_time", "event_type", "group_name", "room", "mentor_name", "topic"],
    fields: [
      { name: "lesson_date", label: "День", type: "date" },
      { name: "lesson_time", label: "Начало", type: "time" },
      { name: "lesson_end_time", label: "Конец", type: "time", required: false },
      { name: "event_type", label: "Тип события", type: "select", options: ["group", "trial", "individual", "event"] },
      { name: "group_name", label: "Группа", required: false },
      { name: "student_name", label: "Ученик", required: false },
      { name: "room", label: "Кабинет" },
      { name: "mentor_name", label: "Ментор" },
      { name: "topic", label: "Тема урока" },
      { name: "status", label: "Статус", type: "select", options: ["scheduled", "cancelled", "moved", "done"], required: false },
      { name: "notes", label: "Заметки", type: "textarea", required: false },
    ],
  },
  "trial-lessons": {
    key: "trial-lessons",
    title: "Пробные уроки",
    description: "Лиды на пробные уроки, источник, статус и конверсия в абонемент.",
    href: "/dashboard/education/trial-lessons",
    table: "robotics_trial_lessons",
    columns: ["child_name", "parent_name", "phone", "source", "trial_date", "status"],
    fields: [
      { name: "child_name", label: "Имя ребёнка" },
      { name: "parent_name", label: "Имя родителя" },
      { name: "phone", label: "Телефон", type: "tel" },
      { name: "source", label: "Источник" },
      { name: "trial_date", label: "Дата", type: "date" },
      { name: "trial_time", label: "Время", type: "time" },
      { name: "mentor_name", label: "Ментор", required: false },
      { name: "status", label: "Статус", type: "select", options: ["записан", "пришёл", "не пришёл", "купил абонемент", "отказался"] },
      { name: "comment", label: "Комментарий", type: "textarea", required: false },
    ],
  },
  subscriptions: {
    key: "subscriptions",
    title: "Абонементы",
    description: "Остаток занятий, сроки, цена, скидка и автоматические предупреждения.",
    href: "/dashboard/education/subscriptions",
    table: "robotics_subscriptions",
    columns: ["student_name", "group_name", "subscription_type", "total_lessons", "remaining_lessons", "end_date", "status"],
    fields: [
      { name: "student_name", label: "Ученик" },
      { name: "group_name", label: "Группа", required: false },
      { name: "subscription_type", label: "Тип абонемента" },
      { name: "total_lessons", label: "Количество занятий", type: "number" },
      { name: "remaining_lessons", label: "Осталось занятий", type: "number" },
      { name: "start_date", label: "Дата начала", type: "date" },
      { name: "end_date", label: "Дата окончания", type: "date" },
      { name: "price", label: "Цена", type: "number" },
      { name: "discount", label: "Скидка", type: "number", required: false },
      { name: "status", label: "Статус", type: "select", options: ["active", "low", "expired", "paused"] },
    ],
  },
  groups: {
    key: "groups",
    title: "Группы",
    description: "Возраст, курс, ментор, расписание, кабинет, ученики, посещаемость и прогресс.",
    href: "/dashboard/education/groups",
    table: "robotics_groups",
    columns: ["name", "course", "age_range", "level", "mentor_name", "room", "max_students", "schedule_days", "start_time", "end_time", "status"],
    fields: [
      { name: "name", label: "Название группы" },
      { name: "course", label: "Курс" },
      { name: "age_range", label: "Возраст" },
      { name: "level", label: "Уровень", type: "select", options: ["beginner", "elementary", "intermediate", "advanced"], required: false },
      { name: "mentor_name", label: "Ментор" },
      { name: "room", label: "Кабинет" },
      { name: "max_students", label: "Максимум учеников", type: "number", required: false },
      { name: "schedule_days", label: "Дни занятий", required: false },
      { name: "start_time", label: "Начало", type: "time", required: false },
      { name: "end_time", label: "Конец", type: "time", required: false },
      { name: "schedule_start_date", label: "Старт расписания", type: "date", required: false },
      { name: "schedule_end_date", label: "Конец расписания", type: "date", required: false },
      { name: "skip_holidays", label: "Пропускать праздники", type: "select", options: ["no", "yes"], required: false },
      { name: "status", label: "Статус", type: "select", options: ["active", "paused", "archived"], required: false },
      { name: "notes", label: "Заметки", type: "textarea", required: false },
      { name: "rating", label: "Рейтинг группы", type: "number", required: false },
    ],
  },
  mentors: {
    key: "mentors",
    title: "Менторы",
    description: "Фото, контакты, группы, расписание, эффективность и отзывы.",
    href: "/dashboard/education/mentors",
    table: "robotics_mentors",
    columns: ["name", "phone", "position", "groups", "efficiency"],
    fields: [
      { name: "photo_url", label: "Фото URL", required: false },
      { name: "name", label: "Имя" },
      { name: "phone", label: "Телефон", type: "tel" },
      { name: "position", label: "Должность" },
      { name: "teams", label: "Команды", required: false },
      { name: "groups", label: "Группы", required: false },
      { name: "schedule", label: "Расписание", required: false },
      { name: "efficiency", label: "Эффективность", type: "number", required: false },
      { name: "reviews", label: "Отзывы", type: "textarea", required: false },
    ],
  },
  families: {
    key: "families",
    title: "Семьи",
    description: "Карточка семьи для 2+ учеников, история оплат и семейная скидка.",
    href: "/dashboard/education/families",
    table: "robotics_families",
    columns: ["parent_name", "phone", "children", "family_discount"],
    fields: [
      { name: "parent_name", label: "Родитель" },
      { name: "phone", label: "Телефон", type: "tel" },
      { name: "address", label: "Адрес", required: false },
      { name: "children", label: "Дети" },
      { name: "family_discount", label: "Семейная скидка", type: "number", required: false },
      { name: "comments", label: "Комментарии", type: "textarea", required: false },
    ],
  },
  feedback: {
    key: "feedback",
    title: "Фидбек",
    description: "Фидбек от менторов: навык, оценка, заметка, дата и связь с учеником.",
    href: "/dashboard/education/feedback",
    table: "robotics_feedback",
    columns: ["student_name", "mentor_name", "skill", "score", "feedback_date", "status"],
    fields: [
      { name: "student_name", label: "Ученик" },
      { name: "group_name", label: "Группа", required: false },
      { name: "mentor_name", label: "Ментор", required: false },
      { name: "skill", label: "Навык" },
      { name: "score", label: "Оценка", type: "number", required: false },
      { name: "feedback_date", label: "Дата", type: "date" },
      { name: "status", label: "Статус", type: "select", options: ["новый", "отправлен", "прочитан"], required: false },
      { name: "note", label: "Комментарий", type: "textarea" },
    ],
  },
  learning: {
    key: "learning",
    title: "Обучение",
    description: "Учебные уроки S7 Robotics: тема, концепт, практика, чек-лист и статус прохождения.",
    href: "/dashboard/education/learning",
    table: "robotics_learning",
    columns: ["lesson_number", "title", "concept", "course", "level", "status"],
    fields: [
      { name: "lesson_number", label: "Номер урока", type: "number" },
      { name: "title", label: "Тема урока" },
      { name: "concept", label: "Концепт" },
      { name: "course", label: "Курс", type: "select", options: ["SPIKE Prime", "EV3", "Python", "Проект"] },
      { name: "level", label: "Уровень", type: "select", options: ["beginner", "intermediate", "advanced"] },
      { name: "explanation", label: "Объяснение", type: "textarea", required: false },
      { name: "practice", label: "Практика", type: "textarea", required: false },
      { name: "checklist", label: "Чек-лист", type: "textarea", required: false },
      { name: "status", label: "Статус", type: "select", options: ["planned", "active", "done"], required: false },
    ],
  },
  tasks: {
    key: "tasks",
    title: "Задачи",
    description: "Task manager с приоритетом, статусом, комментариями и чек-листом.",
    href: "/dashboard/education/tasks",
    table: "robotics_tasks",
    columns: ["title", "assignee", "due_date", "priority", "status"],
    fields: [
      { name: "title", label: "Название" },
      { name: "description", label: "Описание", type: "textarea", required: false },
      { name: "assignee", label: "Исполнитель" },
      { name: "due_date", label: "Дедлайн", type: "date" },
      { name: "priority", label: "Приоритет", type: "select", options: ["low", "medium", "high"] },
      { name: "status", label: "Статус", type: "select", options: ["новая", "в работе", "завершена"] },
      { name: "checklist", label: "Чек-лист", type: "textarea", required: false },
      { name: "comments", label: "Комментарии", type: "textarea", required: false },
    ],
  },
  inventory: {
    key: "inventory",
    title: "Инвентарь",
    description: "Оборудование с QR-кодом, PDF-паспортом и меткой для печати.",
    href: "/dashboard/education/inventory",
    table: "robotics_inventory",
    columns: ["name", "category", "quantity", "condition", "location", "unique_id"],
    fields: [
      { name: "name", label: "Название" },
      { name: "category", label: "Категория" },
      { name: "quantity", label: "Количество", type: "number" },
      { name: "price", label: "Цена", type: "number", required: false },
      { name: "condition", label: "Состояние", type: "select", options: ["new", "good", "repair", "lost"] },
      { name: "location", label: "Местонахождение" },
      { name: "responsible", label: "Ответственный" },
      { name: "unique_id", label: "Уникальный ID" },
    ],
  },
  methods: {
    key: "methods",
    title: "Методика",
    description: "Методические материалы S7: название, курс, цель урока, материалы, инструкции и чек-лист.",
    href: "/dashboard/education/methods",
    table: "robotics_methods",
    columns: ["title", "course", "lesson_number", "level", "status"],
    fields: [
      { name: "title", label: "Название методики" },
      { name: "course", label: "Курс", type: "select", options: ["SPIKE Prime", "EV3", "Python", "Проект"] },
      { name: "lesson_number", label: "Номер урока", type: "number", required: false },
      { name: "level", label: "Уровень", type: "select", options: ["beginner", "intermediate", "advanced"], required: false },
      { name: "goal", label: "Цель", type: "textarea", required: false },
      { name: "materials", label: "Материалы", type: "textarea", required: false },
      { name: "instructions", label: "Инструкция", type: "textarea", required: false },
      { name: "checklist", label: "Чек-лист", type: "textarea", required: false },
      { name: "status", label: "Статус", type: "select", options: ["draft", "active", "archived"], required: false },
    ],
  },
  salaries: {
    key: "salaries",
    title: "Зарплаты",
    description: "Расчёт зарплаты ментора, PDF ведомость, бонусы и штрафы.",
    href: "/dashboard/education/salaries",
    table: "robotics_salaries",
    columns: ["mentor_name", "salary_month", "rate", "lessons_count", "total_salary"],
    fields: [
      { name: "mentor_name", label: "Ментор" },
      { name: "salary_month", label: "Месяц" },
      { name: "rate", label: "Ставка", type: "number" },
      { name: "lessons_count", label: "Количество уроков", type: "number" },
      { name: "bonuses", label: "Бонусы", type: "number", required: false },
      { name: "penalties", label: "Штрафы", type: "number", required: false },
      { name: "total_salary", label: "Итоговая зарплата", type: "number" },
    ],
  },
  team: {
    key: "team",
    title: "Команда",
    description: "Команда центра: админы, менторы, менеджеры, контакты, группы и доступ.",
    href: "/dashboard/education/team",
    table: "robotics_team",
    columns: ["name", "role", "phone", "email", "groups", "status"],
    fields: [
      { name: "name", label: "Имя" },
      { name: "role", label: "Роль", type: "select", options: ["admin", "mentor", "manager", "accountant"] },
      { name: "phone", label: "Телефон", type: "tel", required: false },
      { name: "email", label: "Email", type: "email", required: false },
      { name: "groups", label: "Группы", required: false },
      { name: "permissions", label: "Права", type: "textarea", required: false },
      { name: "status", label: "Статус", type: "select", options: ["active", "pending", "blocked"], required: false },
      { name: "notes", label: "Заметки", type: "textarea", required: false },
    ],
  },
  reports: {
    key: "reports",
    title: "Отчёты",
    description: "Доход, расходы, прибыль, новые ученики, посещаемость, пропуски и эффективность.",
    href: "/dashboard/education/reports",
    columns: [],
    fields: [],
  },
  settings: {
    key: "settings",
    title: "Настройки",
    description: "Логотип, название, валюта, язык, роли доступа и права пользователей.",
    href: "/dashboard/settings",
    columns: [],
    fields: [],
  },
};

export const roboticsModuleList = Object.values(roboticsModules);

export function getRoboticsModule(key: string) {
  return roboticsModules[key as RoboticsModuleKey] ?? roboticsModules.students;
}
