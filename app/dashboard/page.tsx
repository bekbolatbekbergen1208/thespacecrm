import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { dashboardRouteForStoredIndustry } from "@/lib/industry-dashboard";

export default async function DashboardIndexPage() {
  const { membership } = await requireMembership();
  if (!membership) redirect("/onboarding");
  if (membership.role === "employee" && String(membership.position ?? "").toLowerCase().includes("mentor")) {
    redirect("/dashboard/mentor");
  }

  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
  redirect(membership.dashboard_route || company?.dashboard_route || dashboardRouteForStoredIndustry(company?.business_type));
}
