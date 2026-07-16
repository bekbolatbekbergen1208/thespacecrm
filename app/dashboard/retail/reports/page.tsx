import { RetailDashboardContent, type RetailSearchParams } from "@/components/app/retail-dashboard-content";

export default function RetailReportsPage({ searchParams }: { searchParams: Promise<RetailSearchParams> }) {
  return <RetailDashboardContent searchParams={searchParams} section="reports" />;
}
