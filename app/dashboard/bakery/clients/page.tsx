import { BakeryDashboardContent } from "@/components/app/bakery-dashboard-content";

export default function BakeryClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string }>;
}) {
  return <BakeryDashboardContent searchParams={searchParams} section="clients" />;
}
