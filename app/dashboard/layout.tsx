import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import { effectiveEmployeeRoutes, normalizeAllowedRoutes, routeIsAllowed } from "@/lib/employee-permissions";
import { dashboardRouteForStoredIndustry } from "@/lib/industry-dashboard";
import { getServerDictionary, getServerLocale } from "@/lib/i18n-server";
import type { Role } from "@/lib/supabase/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ membership }, dictionary, locale, requestHeaders] = await Promise.all([requireUser(), getServerDictionary(), getServerLocale(), headers()]);
  if (!membership) redirect("/onboarding");

  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
  const dashboardRoute = membership.dashboard_route || company?.dashboard_route || dashboardRouteForStoredIndustry(company?.business_type);
  const allowedRoutes = normalizeAllowedRoutes(membership.allowed_routes);
  const effectiveRoutes = effectiveEmployeeRoutes({ allowedRoutes, dashboardRoute, position: membership.position });
  const currentPath = requestHeaders.get("x-current-path") ?? "/dashboard";

  if (membership.role === "employee" && !routeIsAllowed(currentPath, effectiveRoutes)) {
    redirect(dashboardRoute);
  }

  return (
    <AppShell
      companyName={company?.name ?? "CRM.Space"}
      companyId={company?.id ?? membership.company_id}
      inviteCode={company?.invite_code ?? ""}
      role={membership.role as Role}
      position={membership.position}
      allowedRoutes={allowedRoutes}
      businessType={company?.business_type ?? null}
      dashboardRoute={dashboardRoute}
      dictionary={dictionary}
      locale={locale}
    >
      {children}
    </AppShell>
  );
}
