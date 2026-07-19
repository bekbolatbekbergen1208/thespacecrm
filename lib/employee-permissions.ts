export type RoutePermission = {
  label: string;
  href: string;
};

export const ALWAYS_ALLOWED_EMPLOYEE_ROUTES = [
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/notifications",
] as const;

export const EDUCATION_EMPLOYEE_ROUTES = [
  "/dashboard/education/groups",
  "/dashboard/education/attendance",
] as const;

export function normalizeAllowedRoutes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.startsWith("/dashboard"));
}

export function routeIsAllowed(pathname: string, allowedRoutes: string[]) {
  return allowedRoutes.some((route) => pathname === route || (route !== "/dashboard" && pathname.startsWith(`${route}/`)));
}

export function effectiveEmployeeRoutes({
  allowedRoutes,
  dashboardRoute,
  position,
  businessType,
}: {
  allowedRoutes: string[];
  dashboardRoute: string;
  position?: string | null;
  businessType?: string | null;
}) {
  const isEducation = businessType === "Education Center" || dashboardRoute.startsWith("/dashboard/education");
  const educationOnly = new Set<string>(EDUCATION_EMPLOYEE_ROUTES);
  const workRoutes = isEducation
    ? [...EDUCATION_EMPLOYEE_ROUTES, ...allowedRoutes.filter((route) => educationOnly.has(route as typeof EDUCATION_EMPLOYEE_ROUTES[number]))]
    : [dashboardRoute, ...allowedRoutes];
  const routes = new Set<string>([...ALWAYS_ALLOWED_EMPLOYEE_ROUTES, ...workRoutes]);
  if (String(position ?? "").toLowerCase().includes("mentor")) {
    routes.add("/dashboard/mentor");
  }
  return [...routes];
}

export function defaultEmployeeHomeRoute({
  allowedRoutes,
  dashboardRoute,
  position,
  businessType,
}: {
  allowedRoutes: string[];
  dashboardRoute: string;
  position?: string | null;
  businessType?: string | null;
}) {
  const routes = effectiveEmployeeRoutes({ allowedRoutes, dashboardRoute, position, businessType });
  return routes.find((route) => route !== "/dashboard" && route !== "/dashboard/profile" && route !== "/dashboard/notifications") ?? "/dashboard/profile";
}

export function routePermissionsFromNav(nav: Array<[string, string]>): RoutePermission[] {
  const seen = new Set<string>();
  return nav
    .filter(([, href]) => href.startsWith("/dashboard"))
    .filter(([, href]) => {
      if (seen.has(href)) return false;
      seen.add(href);
      return true;
    })
    .map(([label, href]) => ({ label, href }));
}
