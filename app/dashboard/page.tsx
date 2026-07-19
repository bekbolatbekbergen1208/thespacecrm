import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { defaultEmployeeHomeRoute, normalizeAllowedRoutes } from "@/lib/employee-permissions";
import { dashboardRouteForStoredIndustry } from "@/lib/industry-dashboard";

export default async function DashboardIndexPage() {
  const { membership } = await requireUser();
  if (!membership) redirect("/onboarding");
  if (membership.role === "employee" && String(membership.position ?? "").toLowerCase().includes("mentor")) {
    redirect("/dashboard/mentor");
  }

  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
  const dashboardRoute = membership.dashboard_route || company?.dashboard_route || dashboardRouteForStoredIndustry(company?.business_type);
  if (membership.role === "employee") {
    redirect(defaultEmployeeHomeRoute({
      allowedRoutes: normalizeAllowedRoutes(membership.allowed_routes),
      dashboardRoute,
      position: membership.position,
      businessType: company?.business_type ?? null,
    }));
  }

  redirect(dashboardRoute);
}
