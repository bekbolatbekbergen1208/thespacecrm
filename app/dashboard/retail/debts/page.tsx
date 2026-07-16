import { RetailDashboardContent, type RetailSearchParams } from "@/components/app/retail-dashboard-content";

export default function RetailDebtsPage({ searchParams }: { searchParams: Promise<RetailSearchParams> }) {
  return <RetailDashboardContent searchParams={searchParams} section="debts" />;
}
