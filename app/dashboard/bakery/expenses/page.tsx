import { BakeryDashboardContent } from "@/app/dashboard/bakery/page";

export default function BakeryExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string }>;
}) {
  return <BakeryDashboardContent searchParams={searchParams} section="expenses" />;
}
