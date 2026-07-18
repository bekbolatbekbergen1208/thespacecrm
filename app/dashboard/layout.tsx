import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { isCompanySubscriptionBlocked, requireUser } from "@/lib/auth";
import { dashboardRouteForStoredIndustry } from "@/lib/industry-dashboard";
import { getServerDictionary, getServerLocale } from "@/lib/i18n-server";
import type { Role } from "@/lib/supabase/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ membership }, dictionary, locale] = await Promise.all([requireUser(), getServerDictionary(), getServerLocale()]);
  if (!membership) redirect("/onboarding");

  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies;
  if (isCompanySubscriptionBlocked(company)) redirect("/billing-blocked");
  const dashboardRoute = membership.dashboard_route || company?.dashboard_route || dashboardRouteForStoredIndustry(company?.business_type);

  return (
    <AppShell
      companyName={company?.name ?? "CRM.Space"}
      companyId={company?.id ?? membership.company_id}
      inviteCode={company?.invite_code ?? ""}
      role={membership.role as Role}
      position={membership.position}
      businessType={company?.business_type ?? null}
      dashboardRoute={dashboardRoute}
      dictionary={dictionary}
      locale={locale}
    >
      {children}
    </AppShell>
  );
}
