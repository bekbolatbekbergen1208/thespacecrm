import { BakeryDashboardContent } from "@/components/app/bakery-dashboard-content";

export default function BakeryTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string; department?: string; taskStatus?: string }>;
}) {
  return <BakeryDashboardContent searchParams={searchParams} section="tasks" />;
}
