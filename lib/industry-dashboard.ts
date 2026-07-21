import { dashboardRouteForIndustry, normalizeIndustry, type BusinessIndustry } from "@/lib/industries";
import { roboticsPrimaryNav } from "@/lib/robotics-crm";

export type IndustryDashboardConfig = {
  industry: BusinessIndustry;
  slug: string;
  route: string;
  title: string;
  description: string;
  nav: Array<[string, string]>;
  stats: Array<{ label: string; value: string; note: string }>;
  windows: Array<{
    title: string;
    href: string;
    metric: string;
    detail: string;
  }>;
  reports: string[];
};

const industryConfigs: Record<BusinessIndustry, IndustryDashboardConfig> = {
  "Retail Store": {
    industry: "Retail Store",
    slug: "retail",
    route: "/dashboard/retail",
    title: "Retail Store",
    description: "Товары, фото-поиск, закупочная цена, продажная цена, остатки, продажи, календарь и отчёты.",
    nav: [
      ["Dashboard", "/dashboard/retail"],
      ["Товары и продажи", "/dashboard/retail/products"],
      ["Календарь", "/dashboard/retail/calendar"],
      ["Отчёты", "/dashboard/retail/reports"],
      ["Долги", "/dashboard/retail/debts"],
      ["AI ассистент", "/dashboard/retail/assistant"],
      ["Мусор", "/dashboard/retail/trash"],
      ["Клиенты", "/dashboard/customers"],
      ["Управление сотрудниками", "/dashboard/employees"],
    ],
    stats: [{ label: "Товары", value: "Каталог", note: "Фото, цена и остаток" }, { label: "Продажи", value: "День", note: "Календарь и выручка" }, { label: "Прибыль", value: "Маржа", note: "Закупка минус продажа" }],
    windows: [
      { title: "Товары", href: "/dashboard/retail/products", metric: "Catalog", detail: "Добавляйте товары с фото, адресом, закупкой и количеством." },
      { title: "Продажи", href: "/dashboard/retail/products", metric: "Revenue", detail: "Назначайте товар проданным и считайте остаток." },
      { title: "Календарь", href: "/dashboard/retail/calendar", metric: "Daily", detail: "Смотрите продажи за выбранный день." },
      { title: "Отчёты", href: "/dashboard/retail/reports", metric: "CSV", detail: "Скачивайте дневной отчёт по продажам." },
      { title: "Долги", href: "/dashboard/retail/debts", metric: "Debt", detail: "Контролируйте долги и отправляйте WhatsApp." },
      { title: "AI ассистент", href: "/dashboard/retail/assistant", metric: "AI", detail: "Задавайте вопросы по товарам, остаткам и прибыли." },
    ],
    reports: ["Продажи за день", "Остатки", "Прибыль", "Фото-поиск товаров"],
  },
  "Education Center": {
    industry: "Education Center",
    slug: "education",
    route: "/dashboard/education",
    title: "Education Dashboard",
    description: "Students, teachers, courses, attendance, payments, and reports for learning centers.",
    nav: roboticsPrimaryNav.map(([label, href]) => [label, href]),
    stats: [{ label: "Students", value: "Enrollment", note: "Learner pipeline" }, { label: "Courses", value: "Schedule", note: "Classes and tasks" }, { label: "Payments", value: "Receivables", note: "Track tuition flow" }],
    windows: [{ title: "Ученики", href: "/dashboard/education/students", metric: "Roster", detail: "Manage student records and cards." }, { title: "Менторы", href: "/dashboard/education/mentors", metric: "Faculty", detail: "Manage teachers, mentors, and schedules." }, { title: "Расписание", href: "/dashboard/education/schedule", metric: "Calendar", detail: "Track lessons, course work, and attendance." }, { title: "Оплаты", href: "/dashboard/education/payments", metric: "Finance", detail: "Monitor payment reports and collection priorities." }],
    reports: ["Attendance summary", "Payment follow-up", "Teacher workload", "Course progress"],
  },
  Bakery: {
    industry: "Bakery",
    slug: "bakery",
    route: "/dashboard/bakery",
    title: "Bakery Dashboard",
    description: "Магазины, продукция, Kaspi/наличные, долги, возвраты и остатки.",
    nav: [
      ["Пекарня", "/dashboard/bakery"],
      ["AI ассистент", "/dashboard/bakery/assistant"],
      ["Поиск и день", "/dashboard/bakery/products"],
      ["Продажи продуктов", "/dashboard/bakery/products"],
      ["Денежный отчёт", "/dashboard/bakery/money"],
      ["Расходы", "/dashboard/bakery/expenses"],
      ["Производство", "/dashboard/bakery/production"],
      ["Склад", "/dashboard/bakery/stock"],
      ["Поставщики", "/dashboard/bakery/suppliers"],
      ["Долги", "/dashboard/bakery/debts"],
      ["Доставка", "/dashboard/bakery/delivery"],
      ["Клиенты", "/dashboard/bakery/clients"],
      ["Магазины", "/dashboard/bakery/shops"],
      ["Управление сотрудниками", "/dashboard/employees"],
      ["Настройки", "/dashboard/settings"],
    ],
    stats: [{ label: "Магазины", value: "Routes", note: "Точки продаж" }, { label: "Продукты", value: "Stock", note: "Каталог продукции" }, { label: "Выручка", value: "Cash/Kaspi", note: "Ежедневный расчёт" }],
    windows: [{ title: "Магазины", href: "/dashboard/bakery", metric: "Sales", detail: "Добавляйте магазины и считайте продажи по точкам." }, { title: "Остатки", href: "/dashboard/bakery", metric: "Stock", detail: "Founder добавляет выпуск, система считает остаток." }, { title: "Возвраты", href: "/dashboard/bakery", metric: "Returns", detail: "Возвраты минусуются из суммы." }, { title: "Долги", href: "/dashboard/bakery", metric: "Debt", detail: "Контроль долгов по магазинам и дням." }],
    reports: ["Daily sales", "Cash/Kaspi split", "Returns", "Shop debt"],
  },
  Manufacturing: {
    industry: "Manufacturing",
    slug: "manufacturing",
    route: "/dashboard/bakery",
    title: "Производственный бизнес",
    description: "Производство, продукция, склад, поставщики, расходы, доставка, магазины, долги и денежные отчёты.",
    nav: [
      ["Производственный бизнес", "/dashboard/bakery"],
      ["AI ассистент", "/dashboard/bakery/assistant"],
      ["Продукция", "/dashboard/bakery/products"],
      ["Денежный отчёт", "/dashboard/bakery/money"],
      ["Расходы", "/dashboard/bakery/expenses"],
      ["Производство", "/dashboard/bakery/production"],
      ["Склад", "/dashboard/bakery/stock"],
      ["Поставщики", "/dashboard/bakery/suppliers"],
      ["Доставка", "/dashboard/bakery/delivery"],
      ["Клиенты", "/dashboard/bakery/clients"],
      ["Долги", "/dashboard/bakery/debts"],
      ["Точки продаж", "/dashboard/bakery/shops"],
      ["Управление сотрудниками", "/dashboard/employees"],
      ["Настройки", "/dashboard/settings"],
    ],
    stats: [{ label: "Производство", value: "Выпуск", note: "Продукция за день" }, { label: "Склад", value: "Остатки", note: "Продажи и возвраты" }, { label: "Финансы", value: "Отчёты", note: "Нал, Kaspi, расходы" }],
    windows: [{ title: "Производство", href: "/dashboard/bakery/production", metric: "Output", detail: "Записывайте выпуск продукции за день." }, { title: "Склад", href: "/dashboard/bakery/stock", metric: "Stock", detail: "Контролируйте остатки после продаж и возвратов." }, { title: "Доставка", href: "/dashboard/bakery/delivery", metric: "Routes", detail: "Авто, водители и маршруты по точкам." }, { title: "Деньги", href: "/dashboard/bakery/money", metric: "Finance", detail: "Выручка, расходы, прибыль и CSV." }],
    reports: ["Производство за день", "Остатки", "Доставка", "Денежный отчёт"],
  },
  "Restaurant / Cafe": {
    industry: "Restaurant / Cafe",
    slug: "restaurant",
    route: "/dashboard/restaurant",
    title: "Restaurant Dashboard",
    description: "Orders, tables, menu, kitchen, inventory, staff, and reports for service shifts.",
    nav: [["Orders", "/dashboard/tasks"], ["Tables", "/dashboard/customers"], ["Menu", "/dashboard/inventory"], ["Kitchen", "/dashboard/tasks"], ["Inventory", "/dashboard/inventory"], ["Управление сотрудниками", "/dashboard/employees"], ["Reports", "/dashboard/analytics"]],
    stats: [{ label: "Orders", value: "Open tickets", note: "Service workload" }, { label: "Kitchen", value: "Prep flow", note: "Tasks and timing" }, { label: "Inventory", value: "Ingredients", note: "Stock control" }],
    windows: [{ title: "Orders", href: "/dashboard/tasks", metric: "Queue", detail: "Track order and kitchen tasks." }, { title: "Menu", href: "/dashboard/inventory", metric: "Items", detail: "Manage menu items and ingredient stock." }, { title: "Tables", href: "/dashboard/customers", metric: "Guests", detail: "Use customer records for bookings and VIPs." }, { title: "Staff", href: "/dashboard/employees", metric: "Shift team", detail: "Approve and manage restaurant staff." }],
    reports: ["Order load", "Ingredient stock", "Staff coverage", "Sales by menu"],
  },
  "Clinic / Healthcare": {
    industry: "Clinic / Healthcare",
    slug: "clinic",
    route: "/dashboard/clinic",
    title: "Clinic Dashboard",
    description: "Patients, appointments, doctors, medical records, payments, and reports for clinics.",
    nav: [["Patients", "/dashboard/customers"], ["Appointments", "/dashboard/tasks"], ["Управление сотрудниками", "/dashboard/employees"], ["Medical Records", "/dashboard/profile"], ["Payments", "/dashboard/analytics"], ["Reports", "/dashboard/analytics"]],
    stats: [{ label: "Patients", value: "Care list", note: "Patient CRM" }, { label: "Appointments", value: "Schedule", note: "Open visits" }, { label: "Doctors", value: "Team", note: "Clinical staff" }],
    windows: [{ title: "Patients", href: "/dashboard/customers", metric: "Records", detail: "Manage patient profiles and contact data." }, { title: "Appointments", href: "/dashboard/tasks", metric: "Calendar", detail: "Track visits and follow-up tasks." }, { title: "Doctors", href: "/dashboard/employees", metric: "Providers", detail: "Manage doctors and clinic employees." }, { title: "Payments", href: "/dashboard/analytics", metric: "Billing", detail: "Review payments and patient value reports." }],
    reports: ["Appointment backlog", "Patient follow-up", "Doctor capacity", "Payment summary"],
  },
  Logistics: {
    industry: "Logistics",
    slug: "logistics",
    route: "/dashboard/logistics",
    title: "Logistics Dashboard",
    description: "Deliveries, drivers, vehicles, routes, tracking, and reports for transport teams.",
    nav: [["Deliveries", "/dashboard/tasks"], ["Управление сотрудниками", "/dashboard/employees"], ["Vehicles", "/dashboard/inventory"], ["Routes", "/dashboard/customers"], ["Tracking", "/dashboard/tasks"], ["Reports", "/dashboard/analytics"]],
    stats: [{ label: "Deliveries", value: "Active", note: "Open movement tasks" }, { label: "Drivers", value: "Capacity", note: "Team availability" }, { label: "Vehicles", value: "Fleet", note: "Assets and stock" }],
    windows: [{ title: "Deliveries", href: "/dashboard/tasks", metric: "Dispatch", detail: "Track delivery tasks and route status." }, { title: "Drivers", href: "/dashboard/employees", metric: "Crew", detail: "Manage driver access and records." }, { title: "Vehicles", href: "/dashboard/inventory", metric: "Fleet", detail: "Track vehicles and operating assets." }, { title: "Routes", href: "/dashboard/customers", metric: "Network", detail: "Organize route clients and destinations." }],
    reports: ["Delivery status", "Driver workload", "Vehicle readiness", "Route performance"],
  },
  "Service Business": {
    industry: "Service Business",
    slug: "service",
    route: "/dashboard/service",
    title: "Service Business Dashboard",
    description: "Clients, projects, tasks, employees, payments, and reports for service delivery.",
    nav: [["Clients", "/dashboard/customers"], ["Projects", "/dashboard/tasks"], ["Tasks", "/dashboard/tasks"], ["Управление сотрудниками", "/dashboard/employees"], ["Payments", "/dashboard/analytics"], ["Reports", "/dashboard/analytics"]],
    stats: [{ label: "Clients", value: "Pipeline", note: "CRM activity" }, { label: "Projects", value: "Delivery", note: "Task board" }, { label: "Payments", value: "Cash flow", note: "Revenue tracking" }],
    windows: [{ title: "Clients", href: "/dashboard/customers", metric: "Accounts", detail: "Manage client relationships and values." }, { title: "Projects", href: "/dashboard/tasks", metric: "Workload", detail: "Track project and task progress." }, { title: "Employees", href: "/dashboard/employees", metric: "Team", detail: "Manage service team access." }, { title: "Payments", href: "/dashboard/analytics", metric: "Revenue", detail: "Review payment and project reports." }],
    reports: ["Client value", "Project backlog", "Team workload", "Payment status"],
  },
  Construction: {
    industry: "Construction",
    slug: "construction",
    route: "/dashboard/construction",
    title: "Construction Dashboard",
    description: "Projects, workers, materials, equipment, budget, and reports for construction sites.",
    nav: [["Projects", "/dashboard/tasks"], ["Управление сотрудниками", "/dashboard/employees"], ["Materials", "/dashboard/inventory"], ["Equipment", "/dashboard/inventory"], ["Budget", "/dashboard/analytics"], ["Reports", "/dashboard/analytics"]],
    stats: [{ label: "Projects", value: "Sites", note: "Active work" }, { label: "Materials", value: "Stock", note: "Site supplies" }, { label: "Budget", value: "Cost watch", note: "Spend reports" }],
    windows: [{ title: "Projects", href: "/dashboard/tasks", metric: "Schedule", detail: "Track project phases and site tasks." }, { title: "Workers", href: "/dashboard/employees", metric: "Crew", detail: "Manage workers and approvals." }, { title: "Materials", href: "/dashboard/inventory", metric: "Supply", detail: "Monitor materials and equipment." }, { title: "Budget", href: "/dashboard/analytics", metric: "Finance", detail: "Review budgets and cost reports." }],
    reports: ["Project status", "Material usage", "Equipment readiness", "Budget variance"],
  },
  "Real Estate": {
    industry: "Real Estate",
    slug: "real-estate",
    route: "/dashboard/real-estate",
    title: "Real Estate Dashboard",
    description: "Properties, clients, deals, agents, payments, and reports for real estate teams.",
    nav: [["Properties", "/dashboard/inventory"], ["Clients", "/dashboard/customers"], ["Deals", "/dashboard/tasks"], ["Управление сотрудниками", "/dashboard/employees"], ["Payments", "/dashboard/analytics"], ["Reports", "/dashboard/analytics"]],
    stats: [{ label: "Properties", value: "Listings", note: "Portfolio view" }, { label: "Deals", value: "Pipeline", note: "Open transactions" }, { label: "Agents", value: "Team", note: "Sales capacity" }],
    windows: [{ title: "Properties", href: "/dashboard/inventory", metric: "Listings", detail: "Manage property inventory and values." }, { title: "Clients", href: "/dashboard/customers", metric: "CRM", detail: "Track buyers, sellers, and tenants." }, { title: "Deals", href: "/dashboard/tasks", metric: "Pipeline", detail: "Manage deal tasks and next steps." }, { title: "Agents", href: "/dashboard/employees", metric: "Team", detail: "Manage agents and approvals." }],
    reports: ["Listing value", "Deal progress", "Agent activity", "Payment status"],
  },
  Other: {
    industry: "Other",
    slug: "other",
    route: "/dashboard/other",
    title: "Operations Dashboard",
    description: "Customers, tasks, employees, analytics, and settings for a flexible company workspace.",
    nav: [["Customers", "/dashboard/customers"], ["Tasks", "/dashboard/tasks"], ["Управление сотрудниками", "/dashboard/employees"], ["Analytics", "/dashboard/analytics"], ["Settings", "/dashboard/settings"]],
    stats: [{ label: "Customers", value: "CRM", note: "Pipeline" }, { label: "Tasks", value: "Work", note: "Open operations" }, { label: "Analytics", value: "Reports", note: "Business health" }],
    windows: [{ title: "Customers", href: "/dashboard/customers", metric: "CRM", detail: "Manage customers and values." }, { title: "Tasks", href: "/dashboard/tasks", metric: "Operations", detail: "Track company task execution." }, { title: "Employees", href: "/dashboard/employees", metric: "Team", detail: "Manage access and employees." }, { title: "Analytics", href: "/dashboard/analytics", metric: "Reports", detail: "Review company performance." }],
    reports: ["Customer pipeline", "Task health", "Employee list", "Analytics summary"],
  },
};

export function getIndustryDashboardConfig(industry?: string | null) {
  return industryConfigs[normalizeIndustry(industry)];
}

export function getIndustryDashboardConfigByRoute(route?: string | null) {
  return Object.values(industryConfigs).find((config) => config.route === route) ?? industryConfigs.Other;
}

export function getIndustryDashboardConfigBySlug(slug: string) {
  return Object.values(industryConfigs).find((config) => config.slug === slug) ?? industryConfigs.Other;
}

export function dashboardRouteForStoredIndustry(industry?: string | null) {
  return dashboardRouteForIndustry(industry);
}

export const allIndustryDashboardConfigs = Object.values(industryConfigs);
