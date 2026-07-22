import { BakeryDashboardContent } from "@/components/app/bakery-dashboard-content";

export default function BakeryContractPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; date?: string; saved?: string; aiq?: string; department?: string; taskStatus?: string; contractPrompt?: string }>;
}) {
  return <BakeryDashboardContent searchParams={searchParams} section="contract" />;
}
