"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  LucideIcon,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";

const iconByLabel: Record<string, LucideIcon> = {
  Dashboard: Home,
  Ученики: GraduationCap,
  Оплаты: CreditCard,
  Посещаемость: ClipboardList,
  Расписание: CalendarDays,
  "Пробные уроки": Bell,
  Абонементы: WalletCards,
  Группы: Users,
  Менторы: BriefcaseBusiness,
  Договор: FileText,
  Договоры: FileText,
  Семьи: Users,
  Фидбек: Bell,
  Обучение: GraduationCap,
  Задачи: CheckSquare,
  Инвентарь: Boxes,
  Методика: FileText,
  Зарплаты: CreditCard,
  Команда: Users,
  "Управление сотрудниками": Users,
  Отчёты: BarChart3,
  Настройки: Settings,
  Поставщики: BriefcaseBusiness,
  "AI ассистент": Bot,
  "Поиск и день": CalendarDays,
  "Денежный отчёт": WalletCards,
  Расходы: CreditCard,
  Производство: Boxes,
  Склад: Boxes,
  Долги: CreditCard,
  "Таблица магазинов": BarChart3,
  "Добавить магазин": BriefcaseBusiness,
  "Работа с магазином": CheckSquare,
  Products: Boxes,
  Inventory: Boxes,
  Sales: BarChart3,
  Customers: Users,
  Employees: Users,
  Reports: FileText,
  Profile: Settings,
};

export function NavLink({
  label,
  href,
  iconKey,
  badge,
  variant = "list",
}: {
  label: string;
  href: string;
  iconKey?: string;
  badge?: number;
  variant?: "list" | "tile";
}) {
  const pathname = usePathname();
  const hrefPath = href.split("#")[0];
  const isAnchorLink = href.includes("#");
  const isActive = !isAnchorLink && (pathname === hrefPath || (hrefPath !== "/dashboard" && pathname.startsWith(`${hrefPath}/`)));
  const Icon = iconByLabel[iconKey ?? label] ?? FileText;
  const isTile = variant === "tile";

  return (
    <Link
      href={href}
      prefetch={!isAnchorLink}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl text-sm font-semibold transition ${
        isTile ? "min-h-20 px-3 py-3" : "px-3 py-2.5"
      } ${
        isActive
          ? "text-white"
          : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-100"
      }`}
    >
      {isActive && (
        <span className="absolute inset-0 rounded-2xl border border-cyan-300/[0.18] bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
      )}
      <span
        className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition ${
          isActive
            ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
            : "border-white/10 bg-white/[0.035] text-slate-500 group-hover:text-cyan-100"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className={`relative ${isTile ? "min-w-0 whitespace-normal text-[13px] leading-4" : "truncate"}`}>{label}</span>
      {!!badge && (
        <span className="relative ml-auto grid min-w-6 place-items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black text-white shadow-[0_0_20px_rgba(239,68,68,0.55)]">
          {badge}
        </span>
      )}
    </Link>
  );
}
