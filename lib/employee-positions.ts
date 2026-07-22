export const EMPLOYEE_POSITION_OPTIONS = [
  "Сотрудник",
  "Бухгалтер",
  "Оператор",
  "Старший склада",
  "Склад",
  "Водитель",
  "Менеджер",
  "Ментор",
  "Администратор",
] as const;

export function manufacturingRoutesForPosition(position: string) {
  const normalized = position.toLowerCase();

  if (normalized.includes("бухгалтер")) {
    return ["/dashboard/bakery/money", "/dashboard/bakery/expenses", "/dashboard/bakery/debts"];
  }

  if (normalized.includes("оператор") || normalized.includes("опер")) {
    return ["/dashboard/bakery/tasks", "/dashboard/bakery/production", "/dashboard/bakery/clients", "/dashboard/bakery/delivery"];
  }

  if (normalized.includes("старший склада") || normalized.includes("склад")) {
    return ["/dashboard/bakery/stock", "/dashboard/bakery/products", "/dashboard/bakery/suppliers", "/dashboard/bakery/production"];
  }

  if (normalized.includes("водитель")) {
    return ["/dashboard/bakery/delivery", "/dashboard/bakery/clients", "/dashboard/bakery/shops"];
  }

  return [];
}

export function routesForEmployeePosition(position: string, businessType?: string | null) {
  if (businessType === "Manufacturing") return manufacturingRoutesForPosition(position);
  return [];
}
