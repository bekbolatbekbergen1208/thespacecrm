import { BakeryDashboardContent } from "@/app/dashboard/bakery/page";

export default function BakeryDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string }>;
}) {
  return <BakeryDashboardContent searchParams={searchParams} section="debts" />;
}
