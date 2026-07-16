import { RetailDashboardContent, type RetailSearchParams } from "@/components/app/retail-dashboard-content";

export default function RetailProductsPage({ searchParams }: { searchParams: Promise<RetailSearchParams> }) {
  return <RetailDashboardContent searchParams={searchParams} section="products" />;
}
